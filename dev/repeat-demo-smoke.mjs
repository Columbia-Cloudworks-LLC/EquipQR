#!/usr/bin/env node
/**
 * Runs `dev/demo-gif.mjs --smoke` N times for reliability gating.
 * Usage: node dev/repeat-demo-smoke.mjs [-- extra args passed to demo-gif...]
 * Env: DEMO_RELIABILITY_RUNS (default 5, max 50)
 */
import path from 'path';
import { spawnInherit, runReliabilityGate } from './lib/spawnCapture.mjs';
import { resolveRepoRoot } from './lib/scriptRuntime.mjs';

const repoRoot = resolveRepoRoot(import.meta.url);

const raw = Number.parseInt(process.env.DEMO_RELIABILITY_RUNS || '5', 10);
const runs = Math.min(50, Math.max(1, Number.isFinite(raw) ? raw : 5));

const argv = process.argv.slice(2);
const separatorIndex = argv.indexOf('--');
const extraArgs = separatorIndex >= 0 ? argv.slice(separatorIndex + 1) : argv;

async function runOnce(index) {
  console.log(`\n--- Reliability run ${index + 1}/${runs} ---\n`);
  return spawnInherit(process.execPath, [path.join(repoRoot, 'dev', 'demo-gif.mjs'), '--smoke', ...extraArgs], {
    cwd: repoRoot,
    shell: false,
    env: {
      ...process.env,
      DEMO_RUN_INDEX: String(index + 1)
    }
  });
}

async function main() {
  await runReliabilityGate({
    runs,
    runOnce,
    failureLabel: 'Reliability gate',
    successLabel: 'smoke runs'
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
