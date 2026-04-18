#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  parseDemoGifArgs,
  resolveSmokeWebmRelativePath,
  isLocalhostBaseUrl
} from './lib/demoGifArgs.mjs';
import {
  allocateCanonicalArtifactRelativePath,
  ensureDemoDirectory
} from './lib/demoArtifactPaths.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const scenariosPath = path.join(__dirname, 'demo-scenarios.json');
const defaultViewportByProfile = {
  desktop: { width: 1366, height: 900 },
  mobile: { width: 390, height: 844 }
};

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

/**
 * @param {string} combinedOutput
 * @returns {string | null}
 */
function extractPageUrlFromOutput(combinedOutput) {
  const match = combinedOutput.match(/Page URL:\s+(\S+)/im);
  return match?.[1] ?? null;
}

/**
 * @param {string} pageUrl
 * @param {string} baseUrl
 */
function isAuthLikeUrl(pageUrl, baseUrl) {
  if (!pageUrl) return true;
  try {
    const base = new URL(baseUrl);
    const current = new URL(pageUrl);
    if (current.origin !== base.origin) {
      return false;
    }
    const p = current.pathname.toLowerCase();
    return (
      p.includes('/auth') ||
      p.includes('/login') ||
      p.includes('/sign-in') ||
      p.includes('/signup')
    );
  } catch {
    return true;
  }
}

/**
 * @param {string} baseUrl
 * @param {{ maxAttempts?: number, delayMs?: number }} [opts]
 */
async function waitForDashboardOrThrow(baseUrl, { maxAttempts = 12, delayMs = 1200 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await runPlaywrightCommand(`playwright-cli goto ${baseUrl}/dashboard`);
    const output = `${result.stdout}\n${result.stderr}`;
    const pageUrl = extractPageUrlFromOutput(output);
    if (pageUrl && !isAuthLikeUrl(pageUrl, baseUrl)) {
      return;
    }
    await sleep(delayMs);
  }
  throw new Error(
    `Timed out reaching dashboard at ${baseUrl}/dashboard. ` +
      'For production, use saved auth: run `npx playwright codegen <url> --save-storage=tmp/demos/auth.json` once, then `npm run demo:record:prod` with DEMO_STORAGE_STATE set. ' +
      'Localhost automated persona login remains available via --base-url=http://localhost:8080.'
  );
}

async function ensureBinaryAvailable(name) {
  const checkCommand = process.platform === 'win32' ? `where ${name}` : `command -v ${name}`;
  const result = await runCommand(checkCommand, { allowFailure: true, quiet: true });
  if (result.code !== 0) {
    throw new Error(`Required command "${name}" was not found in PATH.`);
  }
}

function normalizeScenario(rawScenario) {
  return {
    name: rawScenario.name,
    description: rawScenario.description || '',
    route: rawScenario.route || '/dashboard',
    category: rawScenario.category || 'general',
    audience: rawScenario.audience || 'both',
    viewport: rawScenario.viewport || 'desktop',
    tags: Array.isArray(rawScenario.tags) ? rawScenario.tags : [],
    prerequisites: Array.isArray(rawScenario.prerequisites) ? rawScenario.prerequisites : [],
    auth: rawScenario.auth || { persona: 'Alex Apex', role: 'Owner' },
    steps: Array.isArray(rawScenario.steps) ? rawScenario.steps : []
  };
}

async function loadManifest() {
  const manifestRaw = await fs.readFile(scenariosPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);
  const scenarios = Array.isArray(manifest?.scenarios)
    ? manifest.scenarios.map(normalizeScenario)
    : [];

  return { manifest, scenarios };
}

function scenarioMatchesFilters(scenario, { category, audience, tag }) {
  if (category && scenario.category !== category) {
    return false;
  }
  if (audience && scenario.audience !== audience && scenario.audience !== 'both') {
    return false;
  }
  if (tag && !scenario.tags.includes(tag)) {
    return false;
  }
  return true;
}

function printScenarioList(scenarios, filters = {}) {
  const filtered = scenarios.filter((scenario) => scenarioMatchesFilters(scenario, filters));

  if (filtered.length === 0) {
    console.log('No scenarios matched the provided filters.');
    return;
  }

  const grouped = new Map();
  for (const scenario of filtered) {
    const category = scenario.category || 'general';
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category).push(scenario);
  }

  console.log('Available demo scenarios (grouped by category):');
  for (const [category, categoryScenarios] of grouped.entries()) {
    console.log(`\n- ${category}`);
    for (const scenario of categoryScenarios) {
      const tagsText = scenario.tags.length ? ` | tags: ${scenario.tags.join(', ')}` : '';
      const prerequisitesText = scenario.prerequisites.length
        ? ` | prereq: ${scenario.prerequisites.join('; ')}`
        : '';
      console.log(
        `  - ${scenario.name} [audience=${scenario.audience}, viewport=${typeof scenario.viewport === 'string' ? scenario.viewport : 'custom'}]`
      );
      if (scenario.description) {
        console.log(`    ${scenario.description}${tagsText}${prerequisitesText}`);
      }
    }
  }
}

function resolveScenarioByName(scenarios, scenarioName) {
  if (!scenarioName) {
    return null;
  }
  return scenarios.find((item) => item.name === scenarioName) || null;
}

function formatAvailableNames(scenarios) {
  return scenarios.map((item) => item.name).join(', ');
}

async function loadScenario(scenarioName) {
  const { scenarios } = await loadManifest();
  if (!scenarioName) {
    const names = formatAvailableNames(scenarios);
    throw new Error(
      `No scenario specified. Provide one with: node scripts/demo-gif.mjs <scenario>\nAvailable scenarios: ${names}`
    );
  }

  const scenario = resolveScenarioByName(scenarios, scenarioName);
  if (!scenario) {
    const names = formatAvailableNames(scenarios);
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
  return result;
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

function escapeForSingleQuotedJsString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * @param {string} baseUrl
 */
async function loginAsAlexApex(baseUrl) {
  return loginWithPersona(baseUrl, { persona: 'Alex Apex' });
}

/**
 * @param {string} baseUrl
 * @param {{ persona?: string }} [opts]
 */
async function loginWithPersona(baseUrl, { persona = 'Alex Apex' } = {}) {
  const escapedPersona = persona.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  await runPlaywrightCommand(`playwright-cli goto ${baseUrl}/auth`);

  async function navigateToDashboardAndCheckAuth() {
    const result = await runPlaywrightCommand(`playwright-cli goto ${baseUrl}/dashboard`);
    const output = `${result.stdout}\n${result.stderr}`;
    const pageUrl = extractPageUrlFromOutput(output);
    return Boolean(pageUrl && !isAuthLikeUrl(pageUrl, baseUrl));
  }

  // Attempt 2: selector-based fallback.
  await runPlaywrightCommand(
    `playwright-cli eval "() => { const trigger = document.querySelector('[role=combobox]') || Array.from(document.querySelectorAll('button')).find(el => /select a test account|persona/i.test(el.textContent || '')); if (!trigger) throw new Error('Persona dropdown not found on /auth'); trigger.click(); }"`
  );
  await runPlaywrightCommand(
    `playwright-cli eval "() => { const option = Array.from(document.querySelectorAll('[role=option]')).find(el => new RegExp('${escapedPersona}', 'i').test(el.textContent || '')); if (!option) throw new Error('Requested persona option not found: ${escapedPersona}'); option.click(); }"`
  );
  await runPlaywrightCommand(
    `playwright-cli eval "() => { const loginButton = Array.from(document.querySelectorAll('button')).find(el => /quick login/i.test(el.textContent || '')); if (!loginButton) throw new Error('Quick Login button not found after selecting persona'); loginButton.click(); }"`
  );
  await runPlaywrightCommand('playwright-cli snapshot');
  if (await navigateToDashboardAndCheckAuth()) {
    return;
  }

  // Final one-click retry.
  await runPlaywrightCommand(
    `playwright-cli eval "() => { const loginButton = Array.from(document.querySelectorAll('button')).find(el => /quick login/i.test(el.textContent || '')); if (!loginButton) throw new Error('Quick Login button not found in auth retry flow'); loginButton.click(); }"`
  );
  if (!(await navigateToDashboardAndCheckAuth())) {
    throw new Error(`Authentication did not complete for persona: ${persona}`);
  }
}

function resolveViewportConfig(viewport) {
  if (!viewport) {
    return defaultViewportByProfile.desktop;
  }
  if (typeof viewport === 'string') {
    return defaultViewportByProfile[viewport] || defaultViewportByProfile.desktop;
  }
  if (typeof viewport === 'object' && Number.isFinite(viewport.width) && Number.isFinite(viewport.height)) {
    return { width: viewport.width, height: viewport.height };
  }
  return defaultViewportByProfile.desktop;
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

    try {
      await runScenarioStep(step, scenario, index);
    } catch (error) {
      throw new Error(
        `Scenario "${scenario.name}" failed at step ${index + 1}: ${formatStepForError(step)}\n${error.message}`
      );
    }
  }
}

function formatStepForError(step) {
  if (typeof step === 'string') {
    return step;
  }
  if (step && typeof step === 'object') {
    if (step.type === 'playwright') {
      return step.command || JSON.stringify(step);
    }
    if (step.type === 'action') {
      return `action:${step.action}`;
    }
    return JSON.stringify(step);
  }
  return String(step);
}

async function runScenarioStep(step, scenario, index) {
  if (typeof step === 'string') {
    const command = step.trim();
    if (!command) {
      throw new Error(`Empty step at index ${index}.`);
    }
    if (command.startsWith('playwright-cli ')) {
      await runPlaywrightCommand(command);
      return;
    }
    if (command.startsWith('demo:')) {
      await runDemoActionFromString(command);
      return;
    }
    throw new Error(`Unsupported step string "${command}".`);
  }

  if (!step || typeof step !== 'object') {
    throw new Error(`Invalid step format at index ${index}.`);
  }

  if (step.type === 'playwright') {
    if (!step.command || typeof step.command !== 'string') {
      throw new Error('playwright step requires a "command" string.');
    }
    await runPlaywrightCommand(step.command);
    return;
  }

  if (step.type === 'action') {
    await runDemoAction(step);
    return;
  }

  throw new Error(`Unknown step type "${step.type}" in scenario "${scenario.name}".`);
}

async function runDemoActionFromString(rawAction) {
  const [, actionBody] = rawAction.split(':');
  const [actionName, ...rest] = actionBody.trim().split(/\s+/);
  const value = rest.join(' ').trim();

  switch (actionName) {
    case 'pause': {
      const ms = Number.parseInt(value, 10);
      if (!Number.isFinite(ms)) {
        throw new Error(`Invalid pause duration in step "${rawAction}".`);
      }
      await sleep(ms);
      return;
    }
    case 'snapshot':
      await runPlaywrightCommand('playwright-cli snapshot');
      return;
    case 'scrollToBottom':
      await runPlaywrightCommand(`playwright-cli eval "() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }"`);
      return;
    default:
      throw new Error(`Unknown demo action "${actionName}" in step "${rawAction}".`);
  }
}

async function runDemoAction(step) {
  const action = step.action;
  switch (action) {
    case 'pause': {
      const ms = Number.parseInt(String(step.ms ?? 1000), 10);
      await sleep(ms);
      return;
    }
    case 'snapshot':
      await runPlaywrightCommand('playwright-cli snapshot');
      return;
    case 'scroll': {
      const pixels = Number.parseInt(String(step.pixels ?? 500), 10);
      await runPlaywrightCommand(
        `playwright-cli eval "() => { window.scrollBy({ top: ${pixels}, behavior: 'smooth' }); }"`
      );
      return;
    }
    case 'scrollToBottom':
      await runPlaywrightCommand(
        `playwright-cli eval "() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }"`
      );
      return;
    case 'clickByText': {
      const text = String(step.text || '').trim();
      const selector = String(step.selector || 'button,[role=button],a,[role=tab]');
      if (!text) throw new Error('clickByText requires "text".');
      const selectorEscaped = escapeForSingleQuotedJsString(selector);
      const textEscaped = escapeForSingleQuotedJsString(text);
      await runPlaywrightCommand(
        `playwright-cli eval "() => { const el = Array.from(document.querySelectorAll('${selectorEscaped}')).find(node => new RegExp('${textEscaped}', 'i').test(node.textContent || '')); if (!el) throw new Error('Element not found by text: ${textEscaped}'); el.click(); }"`
      );
      return;
    }
    case 'clickSelector': {
      const selector = String(step.selector || '').trim();
      if (!selector) throw new Error('clickSelector requires "selector".');
      const selectorEscaped = escapeForSingleQuotedJsString(selector);
      await runPlaywrightCommand(
        `playwright-cli eval "() => { const el = document.querySelector('${selectorEscaped}'); if (!el) throw new Error('Element not found for selector: ${selectorEscaped}'); el.click(); }"`
      );
      return;
    }
    case 'fill': {
      const selector = String(step.selector || '').trim();
      const value = String(step.value ?? '');
      if (!selector) throw new Error('fill requires "selector".');
      const selectorEscaped = escapeForSingleQuotedJsString(selector);
      const valueEscaped = escapeForSingleQuotedJsString(value);
      await runPlaywrightCommand(
        `playwright-cli eval "() => { const el = document.querySelector('${selectorEscaped}'); if (!el) throw new Error('Input not found for selector: ${selectorEscaped}'); el.focus(); el.value = '${valueEscaped}'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }"`
      );
      return;
    }
    case 'openFirst': {
      const selector = String(step.selector || 'a[href*=/dashboard/equipment/], tr[role=button], [aria-label*="Open "]');
      const selectorEscaped = escapeForSingleQuotedJsString(selector);
      await runPlaywrightCommand(
        `playwright-cli eval "() => { const el = document.querySelector('${selectorEscaped}'); if (!el) throw new Error('No element found for openFirst selector'); el.click(); }"`
      );
      return;
    }
    case 'copyQrAndNavigate': {
      const pattern = String(step.pattern || '/qr/');
      const patternEscaped = escapeForSingleQuotedJsString(pattern);
      await runPlaywrightCommand(
        `playwright-cli eval "() => { const text = Array.from(document.querySelectorAll('div,span,p,code')).map(el => (el.textContent || '').trim()).find(t => t.includes('${patternEscaped}') && /^https?:\\/\\//i.test(t)); if (!text) throw new Error('QR URL not found in current view'); window.location.href = text; }"`
      );
      return;
    }
    default:
      throw new Error(`Unsupported action step "${action}".`);
  }
}

/**
 * Minimal smoke: land on app root, authenticate (localhost persona only), reach dashboard, one .webm.
 * @param {import('./lib/demoGifArgs.mjs').DemoGifCliArgs} parsedArgs
 */
async function runSmokeVideoRecording(parsedArgs) {
  const base = parsedArgs.baseUrl;
  const runIndex = Number.parseInt(process.env.DEMO_RUN_INDEX || '', 10);
  const webmRelativePath = parsedArgs.out
    ? resolveSmokeWebmRelativePath({ out: parsedArgs.out })
    : await allocateCanonicalArtifactRelativePath({
        flow: 'demo-smoke',
        runIndex: Number.isInteger(runIndex) ? runIndex : null
      });

  await ensureBinaryAvailable('playwright-cli');

  await ensureDemoDirectory();

  const viewport = defaultViewportByProfile.desktop;
  let videoStarted = false;

  try {
    await runPlaywrightCommand('playwright-cli open about:blank');
    await runPlaywrightCommand(`playwright-cli resize ${viewport.width} ${viewport.height}`);
    await runPlaywrightCommand('playwright-cli video-start');
    videoStarted = true;

    await runPlaywrightCommand(`playwright-cli goto ${base}/`);
    await sleep(900);

    if (isLocalhostBaseUrl(base)) {
      const personaName = parsedArgs.persona || 'Alex Apex';
      if (personaName === 'Alex Apex') {
        await loginAsAlexApex(base);
      } else {
        await loginWithPersona(base, { persona: personaName });
      }
    } else {
      await waitForDashboardOrThrow(base);
    }

    await runPlaywrightCommand(`playwright-cli goto ${base}/dashboard`);
    await sleep(1800);
    await runPlaywrightCommand('playwright-cli snapshot');

    await stopVideoAtPath(webmRelativePath);
    videoStarted = false;

    const webmAbsolutePath = path.resolve(repoRoot, webmRelativePath);
    const stat = await fs.stat(webmAbsolutePath).catch(() => null);
    if (!stat || stat.size < 256) {
      throw new Error(`Video artifact missing or too small: ${webmRelativePath}`);
    }
    console.log(`Video saved: ${webmAbsolutePath}`);
  } catch (error) {
    console.error(`Demo generation failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    if (videoStarted) {
      await stopVideoAtPath(webmRelativePath).catch(() => undefined);
    }
    await runCommand('playwright-cli close', { allowFailure: true });
  }
}

async function main() {
  const parsedArgs = parseDemoGifArgs(process.argv.slice(2));
  const { scenarios } = await loadManifest();

  if (parsedArgs.listOnly) {
    printScenarioList(scenarios, {
      category: parsedArgs.category,
      audience: parsedArgs.audience,
      tag: parsedArgs.tag
    });
    return;
  }

  if (parsedArgs.smoke) {
    await runSmokeVideoRecording(parsedArgs);
    return;
  }

  const scenario = await loadScenario(parsedArgs.scenarioName);

  await ensureBinaryAvailable('playwright-cli');
  if (!parsedArgs.videoOnly) {
    await ensureBinaryAvailable('ffmpeg');
  }

  await ensureDemoDirectory();

  const runIndex = Number.parseInt(process.env.DEMO_RUN_INDEX || '', 10);
  const webmRelativePath = await allocateCanonicalArtifactRelativePath({
    flow: `scenario-${scenario.name.replace(/[/\\]/g, '-')}`,
    runIndex: Number.isInteger(runIndex) ? runIndex : null
  });
  const gifRelativePath = path.join('tmp', 'demos', `${scenario.name}.gif`);
  const gifAbsolutePath = path.resolve(repoRoot, gifRelativePath);
  const webmAbsolutePath = path.resolve(repoRoot, webmRelativePath);

  const base = parsedArgs.baseUrl;
  let videoStarted = false;

  try {
    // Open a session first, then start capture before navigating to app pages.
    await runPlaywrightCommand('playwright-cli open about:blank');
    const viewport = resolveViewportConfig(scenario.viewport);
    await runPlaywrightCommand(`playwright-cli resize ${viewport.width} ${viewport.height}`);
    await runPlaywrightCommand('playwright-cli video-start');
    videoStarted = true;

    // Required initial app open step.
    await runPlaywrightCommand(`playwright-cli goto ${base}`);

    // Authenticate via Dev Quick Login persona (localhost / dev builds).
    const personaName = parsedArgs.persona || scenario.auth?.persona || 'Alex Apex';
    if (isLocalhostBaseUrl(base)) {
      if (personaName === 'Alex Apex') {
        await loginAsAlexApex(base);
      } else {
        await loginWithPersona(base, { persona: personaName });
      }
    } else {
      await waitForDashboardOrThrow(base);
    }

    // Navigate to scenario route after login.
    await runPlaywrightCommand(`playwright-cli goto ${base}${scenario.route}`);
    await sleep(1500);

    // Run scenario-specific steps.
    await runScenarioSteps(scenario);

    // Stop capture and optionally convert video to GIF.
    await stopVideoAtPath(webmRelativePath);
    videoStarted = false;

    if (!parsedArgs.videoOnly) {
      await runCommand(
        `ffmpeg -y -i "${webmRelativePath}" -vf "fps=10,scale=960:-1:flags=lanczos" "${gifRelativePath}"`,
        { cwd: repoRoot }
      );
      console.log(`GIF generated: ${gifAbsolutePath}`);
    } else {
      const stat = await fs.stat(webmAbsolutePath).catch(() => null);
      if (!stat || stat.size < 256) {
        throw new Error(`Video artifact missing or too small: ${webmRelativePath}`);
      }
      console.log(`Video saved: ${webmAbsolutePath}`);
    }
  } catch (error) {
    console.error(`Demo generation failed: ${error instanceof Error ? error.message : String(error)}`);
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
