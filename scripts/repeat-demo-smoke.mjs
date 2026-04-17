#!/usr/bin/env node
/**
 * Runs `scripts/demo-gif.mjs --smoke` N times for reliability gating.
 * Usage: node scripts/repeat-demo-smoke.mjs [-- extra args passed to demo-gif...]
 * Env: DEMO_RELIABILITY_RUNS (default 5, max 50)
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const raw = Number.parseInt(process.env.DEMO_RELIABILITY_RUNS || '5', 10);
const runs = Math.min(50, Math.max(1, Number.isFinite(raw) ? raw : 5));

const argv = process.argv.slice(2);
const separatorIndex = argv.indexOf('--');
const extraArgs = separatorIndex >= 0 ? argv.slice(separatorIndex + 1) : argv;

async function runOnce(index) {
  console.log(`\n--- Reliability run ${index + 1}/${runs} ---\n`);
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(repoRoot, 'scripts', 'demo-gif.mjs'), '--smoke', ...extraArgs], {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: false,
      env: {
        ...process.env,
        DEMO_RUN_INDEX: String(index + 1)
      }
    });
    child.on('error', reject);
    child.on('close', (c) => resolve(typeof c === 'number' ? c : 1));
  });
  return code;
}

async function main() {
  for (let i = 0; i < runs; i += 1) {
    const code = await runOnce(i);
    if (code !== 0) {
      console.error(`\nReliability gate failed on run ${i + 1}/${runs} (exit ${code}).`);
      process.exit(code);
    }
  }
  console.log(`\nAll ${runs} smoke runs completed successfully.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
