#!/usr/bin/env node
/**
 * Run a repository PowerShell script with Windows PowerShell or pwsh.
 */
import { spawnSync } from 'node:child_process';

const script = process.argv[2];
const args = process.argv.slice(3);

if (!script) {
  console.error('Usage: node dev/invoke-powershell.mjs <script.ps1> [args...]');
  process.exit(2);
}

const candidates = process.platform === 'win32' ? ['powershell.exe', 'pwsh'] : ['pwsh'];

function commandExists(command) {
  const locator = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(locator, [command], { encoding: 'utf8' });
  return result.status === 0;
}

const shell = candidates.find((candidate) => commandExists(candidate));
if (!shell) {
  console.error(`PowerShell is required to run ${script}.`);
  console.error('Linux, WSL, and Codespaces: bash dev/linux/bootstrap.sh installs pwsh.');
  console.error('https://learn.microsoft.com/en-us/powershell/scripting/install/install-ubuntu');
  process.exit(1);
}

const result = spawnSync(
  shell,
  ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, ...args],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
