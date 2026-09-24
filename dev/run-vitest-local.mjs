#!/usr/bin/env node

/**
 * Local Vitest runner with visible phase progress.
 *
 * - Default: unit (node) then component (jsdom) sequentially.
 * - Pass --project unit|component to run a single project.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { getVitestPathFilters, parseReporterArgs, parseVitestLocalArgs } from './lib/parse-vitest-local-args.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const vitestCli = path.join(repoRoot, 'node_modules', 'vitest', 'vitest.mjs');

const rawArgs = process.argv.slice(2);
const { projectFilter, passthroughArgs } = parseVitestLocalArgs(rawArgs);
const reporterArgs = parseReporterArgs(rawArgs);
const pathFilters = getVitestPathFilters(passthroughArgs);


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

// Path filters: let Vitest pick the matching project(s) once (avoid empty component shards).
if (pathFilters.length > 0 && !projectFilter) {
  process.exit(runVitest('filtered', ['run', ...reporterArgs, ...passthroughArgs]));
}

function componentPhases() {
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
