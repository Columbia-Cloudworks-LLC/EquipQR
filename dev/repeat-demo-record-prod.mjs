#!/usr/bin/env node
/**
 * Runs production recording repeatedly for reliability gating.
 * Env: DEMO_PROD_RELIABILITY_RUNS (default 3, max 20)
 */
import { spawnInherit, runReliabilityGate } from './lib/spawnCapture.mjs';
import { resolveRepoRoot } from './lib/scriptRuntime.mjs';

const repoRoot = resolveRepoRoot(import.meta.url);
const rawRuns = Number.parseInt(process.env.DEMO_PROD_RELIABILITY_RUNS || '3', 10);
const runs = Math.min(20, Math.max(1, Number.isFinite(rawRuns) ? rawRuns : 3));

async function runOnce(index) {
  console.log(`\n--- Production reliability run ${index + 1}/${runs} ---\n`);
  return spawnInherit('npm run demo:record:prod', [], {
    cwd: repoRoot,
    shell: true,
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
    failureLabel: 'Production reliability gate',
    successLabel: 'production recording runs'
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
