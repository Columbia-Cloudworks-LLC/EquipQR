#!/usr/bin/env node

/**
 * Local Vitest runner with visible phase progress.
 *
 * - Default: unit (node) then component (jsdom) sequentially.
 * - Pass --project unit|component to run a single project.
 * - On Windows, component tests run in 4 shards unless --shard=N/M is already set.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const vitestCli = path.join(repoRoot, 'node_modules', 'vitest', 'vitest.mjs');
const isWindows = process.platform === 'win32';

const rawArgs = process.argv.slice(2);
const reporterFlag = rawArgs.find((a) => a.startsWith('--reporter'));
const projectIndex = rawArgs.indexOf('--project');
const projectValueIndex = projectIndex >= 0 ? projectIndex + 1 : null;
const projectFilter = projectValueIndex == null ? null : rawArgs[projectValueIndex];
// Preserve first args like --coverage or positional filters when --project is absent.
const passthroughArgs = rawArgs.filter(
  (a, i) =>
    !a.startsWith('--reporter') &&
    !(a === '--project') &&
    (projectValueIndex == null || i !== projectValueIndex),
);
const reporterArgs = reporterFlag ? [reporterFlag] : ['--reporter=default'];

const COMPONENT_SHARDS = 4;

function runVitest(label, args) {
  const banner = `\n${'='.repeat(72)}\n  Vitest: ${label}\n${'='.repeat(72)}\n`;
  process.stdout.write(banner);

  const result = spawnSync(process.execPath, [vitestCli, ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      FORCE_COLOR: process.env.FORCE_COLOR ?? '1',
    },
  });

  return result.status ?? 1;
}

function componentPhases() {
  const hasShardArg = passthroughArgs.some((a) => a.startsWith('--shard='));
  if (isWindows && !hasShardArg) {
    return Array.from({ length: COMPONENT_SHARDS }, (_, i) => {
      const shard = i + 1;
      return {
        label: `component (jsdom) shard ${shard}/${COMPONENT_SHARDS}`,
        args: [
          'run',
          '--project',
          'component',
          `--shard=${shard}/${COMPONENT_SHARDS}`,
          ...reporterArgs,
          ...passthroughArgs,
        ],
      };
    });
  }

  return [
    {
      label: 'component (jsdom)',
      args: ['run', '--project', 'component', ...reporterArgs, ...passthroughArgs],
    },
  ];
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
  phases.push(...componentPhases());
}

let exitCode = 0;
for (const phase of phases) {
  const code = runVitest(phase.label, phase.args);
  if (code !== 0) {
    exitCode = code;
    break;
  }
}

process.exit(exitCode);
