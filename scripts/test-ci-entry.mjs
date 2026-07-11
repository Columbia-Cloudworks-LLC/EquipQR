#!/usr/bin/env node

/**
 * Cross-platform test:ci entry.
 * - Windows: WSL Ubuntu sharded runner (native Vitest IPC breaks on large suites)
 * - Other platforms: serial coverage + ratchet (same as historical npm run test:ci)
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const isWindows = process.platform === 'win32';

if (isWindows) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'test-ci-windows.mjs')], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

const vitestCli = path.join(repoRoot, 'node_modules', 'vitest', 'vitest.mjs');
const coverage = spawnSync(process.execPath, [vitestCli, 'run', '--coverage'], {
  cwd: repoRoot,
  env: { ...process.env, CI: 'true' },
  stdio: 'inherit',
});
if (coverage.status !== 0) {
  process.exit(coverage.status ?? 1);
}

const ratchet = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'coverage-ratchet.mjs')], {
  cwd: repoRoot,
  stdio: 'inherit',
});
process.exit(ratchet.status ?? 0);
