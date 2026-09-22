#!/usr/bin/env node
/**
 * Cross-platform npm ci entry.
 * Windows uses the lock-recovery script. Linux and CI use npm ci directly.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (process.platform === 'win32') {
  const result = spawnSync(
    process.execPath,
    [
      path.join(repoRoot, 'dev', 'invoke-powershell.mjs'),
      path.join(repoRoot, 'dev', 'Invoke-SafeNpmCi.ps1'),
      ...process.argv.slice(2),
    ],
    { stdio: 'inherit', cwd: repoRoot },
  );
  process.exit(result.status ?? 1);
}

const result = spawnSync('npm', ['ci', '--prefer-offline', '--no-audit'], {
  stdio: 'inherit',
  cwd: repoRoot,
});
process.exit(result.status ?? 1);
