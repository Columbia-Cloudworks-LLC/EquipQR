#!/usr/bin/env node

/** Linux coverage and ratchet entrypoint shared by local and CI runs. */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const vitestCli = path.join(repoRoot, 'node_modules', 'vitest', 'vitest.mjs');
const coverage = spawnSync(process.execPath, [vitestCli, 'run', '--coverage'], {
  cwd: repoRoot,
  env: { ...process.env, CI: 'true' },
  stdio: 'inherit',
});
if (coverage.status !== 0) {
  process.exit(coverage.status ?? 1);
}

const ratchet = spawnSync(process.execPath, [path.join(repoRoot, 'dev', 'coverage-ratchet.mjs')], {
  cwd: repoRoot,
  stdio: 'inherit',
});
process.exit(ratchet.status ?? 1);
