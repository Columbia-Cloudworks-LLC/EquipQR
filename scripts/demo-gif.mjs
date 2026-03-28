#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const scenariosPath = path.join(__dirname, 'demo-scenarios.json');
const baseUrl = 'http://localhost:8080';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCommand(command, { cwd = repoRoot, allowFailure = false, quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      if (!quiet) {
        process.stdout.write(text);
      }
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      if (!quiet) {
        process.stderr.write(text);
      }
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0 && !allowFailure) {
        reject(
          new Error(
            `Command failed (${code}): ${command}\n${stderr.trim() || stdout.trim()}`
          )
        );
        return;
      }

      resolve({ code, stdout, stderr });
    });
  });
}

async function ensureBinaryAvailable(name) {
  const checkCommand = process.platform === 'win32' ? `where ${name}` : `command -v ${name}`;
  const result = await runCommand(checkCommand, { allowFailure: true });
  if (result.code !== 0) {
    throw new Error(`Required command "${name}" was not found in PATH.`);
  }
}

async function loadScenario(scenarioName) {
  const manifestRaw = await fs.readFile(scenariosPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const scenarios = Array.isArray(manifest?.scenarios) ? manifest.scenarios : [];

  if (!scenarioName) {
    const names = scenarios.map((scenario) => scenario.name).join(', ');
    throw new Error(
      `No scenario specified. Provide one with: node scripts/demo-gif.mjs <scenario>\nAvailable scenarios: ${names}`
    );
  }

  const scenario = scenarios.find((item) => item.name === scenarioName);
  if (!scenario) {
    const names = scenarios.map((item) => item.name).join(', ');
    throw new Error(`Scenario "${scenarioName}" not found. Available scenarios: ${names}`);
  }

  if (!Array.isArray(scenario.steps)) {
    throw new Error(`Scenario "${scenarioName}" is missing a valid "steps" array.`);
  }

  return scenario;
}

async function runPlaywrightCommand(playwrightCommand) {
  const normalizedCommand = normalizePlaywrightCommand(playwrightCommand);
  const result = await runCommand(normalizedCommand);
  const combinedOutput = `${result.stdout}\n${result.stderr}`;
  if (/^### Error/m.test(combinedOutput) || /Error:\s+/m.test(combinedOutput)) {
    throw new Error(`Playwright command reported an error: ${normalizedCommand}`);
  }
  await sleep(350);
}

function normalizePlaywrightCommand(command) {
  const evalPrefix = 'playwright-cli eval "';
  if (!command.startsWith(evalPrefix)) {
    return command;
  }

  const closingQuoteIndex = command.lastIndexOf('"');
  if (closingQuoteIndex <= evalPrefix.length) {
    return command;
  }

  const expression = command.slice(evalPrefix.length, closingQuoteIndex).trim();
  const suffix = command.slice(closingQuoteIndex + 1);

  if (
    expression.startsWith('() =>') ||
    expression.startsWith('(element) =>') ||
    expression.startsWith('el =>')
  ) {
    return command;
  }

  return `${evalPrefix}() => { ${expression} }"${suffix}`;
}

async function loginAsAlexApex() {
  const commands = [
    `playwright-cli goto ${baseUrl}/auth`,
    // The Dev Quick Login refs are stable in this app and documented in test-with-playwright-cli.md.
    'playwright-cli click e32',
    'playwright-cli click e65',
    `playwright-cli eval "() => { const loginButton = Array.from(document.querySelectorAll('button')).find(el => /quick login/i.test(el.textContent || '')); if (!loginButton) throw new Error('Quick Login button not found after selecting Alex Apex'); loginButton.click(); }"`,
    `playwright-cli snapshot`
  ];

  for (const command of commands) {
    await runPlaywrightCommand(command);
  }
}

async function stopVideoAtPath(webmRelativePath) {
  const normalizedPath = webmRelativePath.replaceAll('\\', '/');
  const legacyResult = await runCommand(`playwright-cli video-stop ${normalizedPath}`, {
    allowFailure: true,
    quiet: true
  });

  if (legacyResult.code === 0) {
    return;
  }

  await runPlaywrightCommand(`playwright-cli video-stop --filename "${normalizedPath}"`);
}

async function runScenarioSteps(scenario) {
  for (let index = 0; index < scenario.steps.length; index += 1) {
    const step = scenario.steps[index];
    if (typeof step !== 'string' || !step.trim()) {
      throw new Error(`Invalid step at index ${index} in scenario "${scenario.name}".`);
    }

    const command = step.trim();
    if (!command.startsWith('playwright-cli ')) {
      throw new Error(
        `Unsupported step "${command}" in scenario "${scenario.name}". Steps must start with "playwright-cli ".`
      );
    }

    try {
      await runPlaywrightCommand(command);
    } catch (error) {
      throw new Error(
        `Scenario "${scenario.name}" failed at step ${index + 1}: ${command}\n${error.message}`
      );
    }
  }
}

async function main() {
  const scenarioName = process.argv[2];
  const scenario = await loadScenario(scenarioName);

  await ensureBinaryAvailable('playwright-cli');
  await ensureBinaryAvailable('ffmpeg');

  const demosDir = path.join(repoRoot, 'tmp', 'demos');
  await fs.mkdir(demosDir, { recursive: true });

  const webmRelativePath = path.join('tmp', 'demos', `${scenario.name}.webm`);
  const gifRelativePath = path.join('tmp', 'demos', `${scenario.name}.gif`);
  const gifAbsolutePath = path.resolve(repoRoot, gifRelativePath);

  let videoStarted = false;

  try {
    // Open a session first, then start capture before navigating to app pages.
    await runPlaywrightCommand('playwright-cli open about:blank');
    await runPlaywrightCommand('playwright-cli video-start');
    videoStarted = true;

    // Required initial app open step.
    await runPlaywrightCommand(`playwright-cli goto ${baseUrl}`);

    // Authenticate via Dev Quick Login persona (Alex Apex / Owner).
    await loginAsAlexApex();

    // Navigate to scenario route after login.
    await runPlaywrightCommand(`playwright-cli goto ${baseUrl}${scenario.route}`);

    // Run scenario-specific steps.
    await runScenarioSteps(scenario);

    // Stop capture and convert video to GIF.
    await stopVideoAtPath(webmRelativePath);
    videoStarted = false;

    await runCommand(
      `ffmpeg -y -i "${webmRelativePath}" -vf "fps=10,scale=960:-1:flags=lanczos" "${gifRelativePath}"`,
      { cwd: repoRoot }
    );

    console.log(`GIF generated: ${gifAbsolutePath}`);
  } catch (error) {
    console.error(`Demo generation failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (videoStarted) {
      await stopVideoAtPath(webmRelativePath).catch(() => undefined);
    }
    await runCommand('playwright-cli close', { allowFailure: true });
  }
}

main().catch((error) => {
  console.error(`Demo generation failed: ${error.message}`);
  process.exit(1);
});
