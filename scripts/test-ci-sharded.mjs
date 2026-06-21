#!/usr/bin/env node

/**
 * Run the Vitest suite in CI-style shards, merge coverage, and ratchet thresholds.
 *
 * Usage:
 *   node scripts/test-ci-sharded.mjs [--shards=6]
 *
 * Mirrors GitHub Actions: four parallel jobs locally run sequentially here, each
 * writing artifacts under coverage-shards/coverage-shard-<N>/ before merge.
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const args = process.argv.slice(2);
const shardsArg = args.find((a) => a.startsWith('--shards='));
const shardTotal = shardsArg ? Number.parseInt(shardsArg.split('=')[1], 10) : 6;

if (!Number.isFinite(shardTotal) || shardTotal < 1) {
  console.error('❌ Invalid --shards=N value');
  process.exit(2);
}

const shardsRoot = path.join(repoRoot, 'coverage-shards');
if (fs.existsSync(shardsRoot)) {
  fs.rmSync(shardsRoot, { recursive: true, force: true });
}
fs.mkdirSync(shardsRoot, { recursive: true });

function runShard(shardIndex) {
  console.log(`\n🧪 Shard ${shardIndex}/${shardTotal}...`);
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, 'scripts', 'test-ci-shard.mjs'), `--shard=${shardIndex}/${shardTotal}`],
    {
      cwd: repoRoot,
      env: { ...process.env, CI: 'true' },
      stdio: 'inherit',
    },
  );

  if (result.status !== 0) {
    console.error(`❌ Shard ${shardIndex}/${shardTotal} failed (exit ${result.status ?? 'unknown'})`);
    process.exit(result.status ?? 1);
  }

  const shardDest = path.join(shardsRoot, `coverage-shard-${shardIndex}`);
  fs.mkdirSync(shardDest, { recursive: true });

  const coverageDir = path.join(repoRoot, 'coverage');
  for (const name of ['coverage-final.json', 'coverage-summary.json', 'lcov.info']) {
    const src = path.join(coverageDir, name);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.join(shardDest, 'coverage'), { recursive: true });
      fs.copyFileSync(src, path.join(shardDest, 'coverage', name));
    }
  }
}

for (let i = 1; i <= shardTotal; i += 1) {
  runShard(i);
}

console.log('\n📦 Merging shard coverage...');
const merge = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'merge-coverage.mjs')], {
  cwd: repoRoot,
  stdio: 'inherit',
});
if (merge.status !== 0) {
  process.exit(merge.status ?? 1);
}

console.log('\n📊 Running coverage ratchet...');
const ratchet = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'coverage-ratchet.mjs')], {
  cwd: repoRoot,
  stdio: 'inherit',
});
process.exit(ratchet.status ?? 0);
