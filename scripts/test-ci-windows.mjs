#!/usr/bin/env node

/**
 * Windows entry for `npm run test:ci`.
 *
 * Vitest 4 fork/threads worker IPC hits a serialize() stack overflow on Windows
 * when running large sharded suites with coverage (see vitest-dev/vitest#8861).
 * Single-file runs work; full-suite native Windows runs do not.
 *
 * This script runs the same sharded CI flow inside WSL on ext4, matching Linux CI behavior.
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

/** Ephemeral WSL sync target — never use a user-owned project directory. */
const WSL_SANDBOX = '~/.cache/equipqr/test-ci';

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
WSL_HOME="/home/$(whoami)"
SANDBOX="$WSL_HOME/.cache/equipqr/test-ci"
EXPECTED_SANDBOX="$WSL_HOME/.cache/equipqr/test-ci"
if [ "$SANDBOX" != "$EXPECTED_SANDBOX" ]; then
  echo "❌ Unexpected sandbox path: $SANDBOX"
  exit 1
fi
mkdir -p "$SANDBOX"
export NVM_DIR="$WSL_HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
else
  echo "❌ nvm not installed in WSL. Install Node 24: https://github.com/nvm-sh/nvm"
  exit 1
fi
nvm use 24 >/dev/null 2>&1 || nvm install 24
echo "⚠️  Overwriting WSL sandbox at $SANDBOX"
rsync -a --delete --exclude node_modules --exclude coverage --exclude coverage-shards --exclude tmp --exclude .git "${repoWsl}/" "$SANDBOX/"
cd "$SANDBOX"
npm ci --prefer-offline --no-audit
export CI=true
node scripts/test-ci-sharded.mjs --shards=4
`.trim();

const scriptDir = fs.mkdtempSync(path.join(repoRoot, 'tmp', 'equipqr-test-ci-'));
const scriptPath = path.join(scriptDir, 'run.sh');
fs.writeFileSync(scriptPath, `${bashScript}\n`, { encoding: 'utf8', mode: 0o700, flag: 'wx' });
const scriptWsl = toWslPath(scriptPath);

const wslDistro = process.env.WSL_DISTRO?.trim();
const wslArgs = wslDistro
  ? ['-d', wslDistro, '--', 'bash', scriptWsl]
  : ['--', 'bash', scriptWsl];

console.log('🪟 Windows detected — running sharded test:ci inside WSL (Linux CI parity)...');
console.log(`   Source: ${repoWsl}`);
console.log(`   Target: ${WSL_SANDBOX} (ephemeral sandbox; contents will be overwritten)`);
if (wslDistro) {
  console.log(`   WSL distro: ${wslDistro} (from WSL_DISTRO)`);
} else {
  console.log('   WSL distro: default (set WSL_DISTRO to override)');
}
console.log('');

const result = spawnSync('wsl', wslArgs, {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env,
});

try {
  fs.rmSync(scriptDir, { recursive: true, force: true });
} catch {
  // ignore cleanup errors
}

process.exit(result.status ?? 1);
