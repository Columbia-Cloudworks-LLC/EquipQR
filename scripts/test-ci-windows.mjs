#!/usr/bin/env node

/**
 * Windows entry for `npm run test:ci`.
 *
 * Vitest 4 fork/threads worker IPC hits a serialize() stack overflow on Windows
 * when running large sharded suites with coverage (see vitest-dev/vitest#8861).
 * Single-file runs work; full-suite native Windows runs do not.
 *
 * This script runs the same sharded CI flow inside WSL Ubuntu on ext4
 * (~/EquipQR), matching Linux CI behavior.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

function toWslPath(winPath) {
  const resolved = path.resolve(winPath);
  const match = /^([A-Za-z]):[\\/](.*)$/.exec(resolved);
  if (!match) {
    throw new Error(`Cannot map path to WSL: ${resolved}`);
  }
  const drive = match[1].toLowerCase();
  const rest = match[2].replace(/\\/g, '/');
  return `/mnt/${drive}/${rest}`;
}

const repoWsl = toWslPath(repoRoot);

const bashScript = `
set -euo pipefail
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
else
  echo "❌ nvm not installed in WSL. Install Node 24: https://github.com/nvm-sh/nvm"
  exit 1
fi
nvm use 24 >/dev/null 2>&1 || nvm install 24
rsync -a --delete --exclude node_modules --exclude coverage --exclude coverage-shards --exclude tmp --exclude .git "${repoWsl}/" "$HOME/EquipQR/"
cd "$HOME/EquipQR"
npm ci --prefer-offline --no-audit
export CI=true
node scripts/test-ci-sharded.mjs --shards=4
`.trim();

console.log('🪟 Windows detected — running sharded test:ci inside WSL Ubuntu (Linux CI parity)...');
console.log(`   Source: ${repoWsl}`);
console.log('   Target: ~/EquipQR (ext4)\n');

const result = spawnSync('wsl', ['-d', 'Ubuntu', '--', 'bash', '-lc', bashScript], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
