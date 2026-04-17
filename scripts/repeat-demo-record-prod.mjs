#!/usr/bin/env node
/**
 * Runs production recording repeatedly for reliability gating.
 * Env: DEMO_PROD_RELIABILITY_RUNS (default 3, max 20)
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const rawRuns = Number.parseInt(process.env.DEMO_PROD_RELIABILITY_RUNS || '3', 10);
const runs = Math.min(20, Math.max(1, Number.isFinite(rawRuns) ? rawRuns : 3));

async function runOnce(index) {
  console.log(`\n--- Production reliability run ${index + 1}/${runs} ---\n`);
  return new Promise((resolve, reject) => {
    const child = spawn('npm run demo:record:prod', {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        DEMO_RUN_INDEX: String(index + 1)
      }
    });
    child.on('error', reject);
    child.on('close', (code) => resolve(typeof code === 'number' ? code : 1));
  });
}

async function main() {
  for (let i = 0; i < runs; i += 1) {
    const code = await runOnce(i);
    if (code !== 0) {
      console.error(`\nProduction reliability gate failed on run ${i + 1}/${runs} (exit ${code}).`);
      process.exit(code);
    }
  }
  console.log(`\nAll ${runs} production recording runs completed successfully.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
