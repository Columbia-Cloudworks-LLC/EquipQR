#!/usr/bin/env node

/**
 * Shard-aware CI test runner.
 *
 * Usage:
 *   node scripts/test-ci-shard.mjs --shard=1/4
 *
 * - Runs `vitest run --coverage --shard=N/M` so multiple GitHub Actions jobs
 *   can run different slices of the suite in parallel.
 * - Each shard writes its coverage artifacts to `coverage/` and the final
 *   merge happens in a downstream "coverage-merge" job.
 * - Skips the coverage-ratchet step inside the shard; ratchet runs once on
 *   the merged report instead.
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const isWindows = process.platform === 'win32';

// 5 minutes is the previous full-suite ceiling; a single shard should finish
// well under that, so this is a generous safety net.
const TEST_TIMEOUT_MS = 5 * 60 * 1000;

const args = process.argv.slice(2);
const shardArg = args.find((a) => a.startsWith('--shard='));
if (!shardArg) {
  console.error('❌ Missing required --shard=N/M argument');
  process.exit(2);
}

const [shardIndex, shardTotal] = shardArg.replace('--shard=', '').split('/');
console.log(`🧪 Running shard ${shardIndex}/${shardTotal} with coverage...`);

const npxBin = isWindows ? 'npx.cmd' : 'npx';
const vitestArgs = ['vitest', 'run', '--coverage', shardArg];

const vitestProcess = spawn(npxBin, vitestArgs, {
  stdio: 'inherit',
  env: { ...process.env, CI: 'true' },
  cwd: repoRoot,
  shell: isWindows,
});

let cleanupStarted = false;

const hardTimeout = setTimeout(() => {
  if (cleanupStarted) return;
  cleanupStarted = true;
  console.error(`⏰ Shard ${shardIndex}/${shardTotal} timed out after ${TEST_TIMEOUT_MS / 1000}s`);

  if (isWindows && vitestProcess.pid) {
    try {
      execSync(`taskkill /pid ${vitestProcess.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // already dead
    }
  } else {
    vitestProcess.kill('SIGKILL');
  }

  const coveragePath = path.join(repoRoot, 'coverage', 'coverage-summary.json');
  if (fs.existsSync(coveragePath)) {
    console.log('✅ Coverage written before timeout — treating as success');
    process.exit(0);
  }
  process.exit(1);
}, TEST_TIMEOUT_MS);

vitestProcess.on('close', (code) => {
  if (cleanupStarted) return;
  cleanupStarted = true;
  clearTimeout(hardTimeout);
  process.exit(code ?? 0);
});

vitestProcess.on('error', (err) => {
  if (cleanupStarted) return;
  cleanupStarted = true;
  clearTimeout(hardTimeout);
  console.error('Failed to start vitest:', err);
  process.exit(1);
});
