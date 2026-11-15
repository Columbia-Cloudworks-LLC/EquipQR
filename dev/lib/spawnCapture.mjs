import { spawn } from 'child_process';

/**
 * Runs a command without a shell and resolves with its exit code and captured output.
 * @param {string} command
 * @param {string[]} [args]
 * @param {{ cwd?: string, echo?: boolean }} [options] echo mirrors child output to this process
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
export function spawnCapture(command, args = [], options = {}) {
  const { cwd, echo = false } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      if (echo) process.stdout.write(text);
    });
    child.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      if (echo) process.stderr.write(text);
    });
    child.on('error', reject);
    child.on('close', (code) =>
      resolve({ code: typeof code === 'number' ? code : 1, stdout, stderr })
    );
  });
}

/**
 * Runs a command with inherited stdio and resolves with its exit code.
 * @param {string} command
 * @param {string[]} args
 * @param {import('child_process').SpawnOptions} [options]
 * @returns {Promise<number>}
 */
export function spawnInherit(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => resolve(typeof code === 'number' ? code : 1));
  });
}

/**
 * Runs `runOnce(index)` for each run and exits the process with the first non-zero code.
 * @param {{
 *   runs: number,
 *   runOnce: (index: number) => Promise<number>,
 *   failureLabel: string,
 *   successLabel: string,
 * }} options
 */
export async function runReliabilityGate({ runs, runOnce, failureLabel, successLabel }) {
  for (let i = 0; i < runs; i += 1) {
    const code = await runOnce(i);
    if (code !== 0) {
      console.error(`\n${failureLabel} failed on run ${i + 1}/${runs} (exit ${code}).`);
      process.exit(code);
    }
  }
  console.log(`\nAll ${runs} ${successLabel} completed successfully.`);
}
