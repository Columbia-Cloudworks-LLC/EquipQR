#!/usr/bin/env node

/**
 * Unified Vitest test runner for local, CI, single-shard, and multi-shard execution.
 *
 * Modes:
 *   - Local (default or --local): runs unit (node) then component (jsdom) sequentially,
 *     or a single project (--project unit|component), or filtered test file path(s).
 *   - CI (--ci): runs `vitest run --coverage` with CI=true followed by coverage-ratchet.
 *   - Single CI Shard (--shard=N/M): runs `vitest run --coverage --shard=N/M` with a
 *     10-minute hard timeout and JSON result output directory.
 *   - Local Sharded CI (--shards=N): runs shards 1..N sequentially, merges shard
 *     coverage reports, and runs the coverage ratchet.
 */

import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getVitestPathFilters,
  parseReporterArgs,
  parseTestRunnerArgs,
  parseVitestLocalArgs,
} from './lib/parse-vitest-local-args.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const vitestCli = path.join(repoRoot, 'node_modules', 'vitest', 'vitest.mjs');
const TEST_TIMEOUT_MS = 10 * 60 * 1000;

function runVitestSync(label, args, envOverrides = {}) {
  if (label) {
    const banner = `\n${'='.repeat(72)}\n  Vitest: ${label}\n${'='.repeat(72)}\n`;
    process.stdout.write(banner);
  }

  const result = spawnSync(process.execPath, [vitestCli, ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      FORCE_COLOR: process.env.FORCE_COLOR ?? '1',
      ...envOverrides,
    },
  });

  return result.status ?? 1;
}

function runLocalMode(rawArgs) {
  const { projectFilter, passthroughArgs } = parseVitestLocalArgs(rawArgs);
  const reporterArgs = parseReporterArgs(rawArgs);
  const pathFilters = getVitestPathFilters(passthroughArgs);

  if (pathFilters.length > 0 && !projectFilter) {
    process.exit(runVitestSync('filtered', ['run', ...reporterArgs, ...passthroughArgs]));
  }

  /** @type {{ label: string; args: string[] }[]} */
  const phases = [];

  if (!projectFilter || projectFilter === 'unit') {
    phases.push({
      label: 'unit (node)',
      args: ['run', '--project', 'unit', ...reporterArgs, ...passthroughArgs],
    });
  }

  if (!projectFilter || projectFilter === 'component') {
    phases.push({
      label: 'component (jsdom)',
      args: ['run', '--project', 'component', ...reporterArgs, ...passthroughArgs],
    });
  }

  let exitCode = 0;
  for (const phase of phases) {
    const code = runVitestSync(phase.label, phase.args);
    if (code !== 0) {
      exitCode = code;
      break;
    }
  }

  process.exit(exitCode);
}

function runCiMode() {
  const coverageStatus = runVitestSync('', ['run', '--coverage'], { CI: 'true' });
  if (coverageStatus !== 0) {
    process.exit(coverageStatus);
  }

  const ratchet = spawnSync(process.execPath, [path.join(repoRoot, 'dev', 'coverage-ratchet.mjs')], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  process.exit(ratchet.status ?? 1);
}

function runShardMode(shardArg, shardIndex, shardTotal) {
  console.log(`🧪 Running shard ${shardIndex}/${shardTotal} with coverage...`);

  fs.mkdirSync(path.join(repoRoot, 'artifacts', 'vitest-results'), { recursive: true });

  const vitestArgs = ['run', '--coverage', shardArg];
  const vitestProcess = spawn(process.execPath, [vitestCli, ...vitestArgs], {
    stdio: 'inherit',
    env: { ...process.env, CI: 'true' },
    cwd: repoRoot,
    shell: false,
  });

  let cleanupStarted = false;

  const hardTimeout = setTimeout(() => {
    if (cleanupStarted) return;
    cleanupStarted = true;
    console.error(`⏰ Shard ${shardIndex}/${shardTotal} timed out after ${TEST_TIMEOUT_MS / 1000}s`);
    vitestProcess.kill('SIGKILL');
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
}

function runShardedMode(shardTotal) {
  const shardsRoot = path.join(repoRoot, 'coverage-shards');
  if (fs.existsSync(shardsRoot)) {
    fs.rmSync(shardsRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(shardsRoot, { recursive: true });

  const runnerScript = path.join(repoRoot, 'dev', 'test-runner.mjs');

  for (let shardIndex = 1; shardIndex <= shardTotal; shardIndex += 1) {
    console.log(`\n🧪 Shard ${shardIndex}/${shardTotal}...`);
    const result = spawnSync(
      process.execPath,
      [runnerScript, `--shard=${shardIndex}/${shardTotal}`],
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

  console.log('\n📦 Merging shard coverage...');
  const merge = spawnSync(process.execPath, [path.join(repoRoot, 'dev', 'merge-coverage.mjs')], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (merge.status !== 0) {
    process.exit(merge.status ?? 1);
  }

  console.log('\n📊 Running coverage ratchet...');
  const ratchet = spawnSync(process.execPath, [path.join(repoRoot, 'dev', 'coverage-ratchet.mjs')], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  process.exit(ratchet.status ?? 0);
}

export function runCli(rawArgs = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = parseTestRunnerArgs(rawArgs);
  } catch (err) {
    console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }

  if (parsed.mode === 'shard') {
    runShardMode(parsed.shard, parsed.shardIndex, parsed.shardTotal);
    return;
  }

  if (parsed.mode === 'sharded') {
    runShardedMode(parsed.shardTotal);
    return;
  }

  if (parsed.mode === 'ci') {
    runCiMode();
    return;
  }

  runLocalMode(parsed.localArgs);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runCli();
}
