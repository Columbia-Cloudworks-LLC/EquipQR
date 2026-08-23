import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const demoGifRepoRoot = path.resolve(__dirname, '..', '..');

/**
 * @param {number} ms
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} command
 * @param {{ cwd?: string, allowFailure?: boolean, quiet?: boolean }} [opts]
 */
export async function runCommand(command, { cwd = demoGifRepoRoot, allowFailure = false, quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
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
            `Command failed (${code}): ${command}\n${stderr.trim() || stdout.trim()}`,
          ),
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
export function extractPageUrlFromOutput(combinedOutput) {
  const match = combinedOutput.match(/Page URL:\s+(\S+)/im);
  return match?.[1] ?? null;
}

/**
 * @param {string} command
 */
export function normalizePlaywrightCommand(command) {
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

/**
 * @param {string} playwrightCommand
 */
export async function runPlaywrightCommand(playwrightCommand) {
  const normalizedCommand = normalizePlaywrightCommand(playwrightCommand);
  const result = await runCommand(normalizedCommand);
  const combinedOutput = `${result.stdout}\n${result.stderr}`;
  if (/^### Error/m.test(combinedOutput) || /Error:\s+/m.test(combinedOutput)) {
    throw new Error(`Playwright command reported an error: ${normalizedCommand}`);
  }
  await sleep(350);
  return result;
}

/**
 * @param {string} name
 */
export async function ensureBinaryAvailable(name) {
  const checkCommand = process.platform === 'win32' ? `where ${name}` : `command -v ${name}`;
  const result = await runCommand(checkCommand, { allowFailure: true, quiet: true });
  if (result.code !== 0) {
    throw new Error(`Required command "${name}" was not found in PATH.`);
  }
}
