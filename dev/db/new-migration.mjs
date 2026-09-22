#!/usr/bin/env node
/**
 * Create a Supabase migration without leaving stdin open.
 * Windows keeps the existing PowerShell wrapper. Linux closes stdin and times out.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * @param {string} name
 */
export function assertMigrationName(name) {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error('Migration name must be snake_case and start with a letter.');
  }
}

function runWindows(name) {
  const script = path.join(repoRoot, 'dev', 'db', 'New-SupabaseMigration.ps1');
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, 'dev', 'invoke-powershell.mjs'), script, '-Name', name],
    { stdio: 'inherit', cwd: repoRoot },
  );
  process.exit(result.status ?? 1);
}

function runLinux(name) {
  const result = spawnSync('npx', ['supabase', 'migration', 'new', name], {
    cwd: repoRoot,
    stdio: ['ignore', 'inherit', 'inherit'],
    timeout: 30_000,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

function main() {
  const name = process.argv[2];
  if (!name) {
    console.error('Usage: node dev/db/new-migration.mjs <snake_case_name>');
    process.exit(2);
  }
  try {
    assertMigrationName(name);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
  if (process.platform === 'win32') {
    runWindows(name);
    return;
  }
  runLinux(name);
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  main();
}
