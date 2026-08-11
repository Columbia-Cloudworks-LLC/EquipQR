#!/usr/bin/env node
/**
 * Ensures SECURITY DEFINER RPC allowlists stay aligned across:
 * - scripts/security-definer-rpc-allowlists.json
 * - the latest bulk lockdown / re-lockdown migration
 *
 * Usage: node scripts/validate-security-definer-allowlist-sync.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const jsonPath = path.join(repoRoot, 'scripts/security-definer-rpc-allowlists.json');
const migrationsDir = path.join(repoRoot, 'supabase/migrations');

/**
 * Newest migration that declares the bulk allowlist arrays (lexicographic
 * timestamp prefix — Supabase migration naming). Scan newest-first and stop.
 */
function resolveLockdownMigrationPath() {
  const marker = 'authenticated_allowlist text[] := ARRAY[';
  const candidates = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .reverse();

  for (const name of candidates) {
    const content = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
    if (content.includes(marker)) {
      return path.join(migrationsDir, name);
    }
  }

  throw new Error(
    `No migration in ${migrationsDir} declares authenticated_allowlist`,
  );
}

function extractArray(content, varName) {
  const re = new RegExp(
    `${varName}\\s+text\\[\\]\\s*:=\\s*ARRAY\\[([\\s\\S]*?)\\];`,
    'm',
  );
  const match = content.match(re);
  if (!match) {
    throw new Error(`Could not parse ${varName} from lockdown migration`);
  }
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
}

function main() {
  const allowlists = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const migrationPath = resolveLockdownMigrationPath();
  const migration = fs.readFileSync(migrationPath, 'utf8');

  const migrationAuth = extractArray(migration, 'authenticated_allowlist');
  const migrationAnon = extractArray(migration, 'anon_allowlist');
  const migrationRls = extractArray(migration, 'rls_helper_allowlist');
  const migrationInvoker = extractArray(migration, 'invoker_client_allowlist');

  const jsonAuth = [...allowlists.authenticatedPublicRpc].sort();
  const jsonAnon = [...allowlists.anonPublicRpc].sort();
  const jsonRls = [...allowlists.rlsPredicateHelpers].sort();
  const jsonInvoker = [...(allowlists.invokerClientRpc ?? [])].sort();

  const diffs = [];

  function compare(label, a, b) {
    const onlyA = a.filter((x) => !b.includes(x));
    const onlyB = b.filter((x) => !a.includes(x));
    if (onlyA.length > 0 || onlyB.length > 0) {
      diffs.push({ label, onlyA, onlyB });
    }
  }

  compare('authenticatedPublicRpc', migrationAuth, jsonAuth);
  compare('anonPublicRpc', migrationAnon, jsonAnon);
  compare('rlsPredicateHelpers', migrationRls, jsonRls);
  compare('invokerClientRpc', migrationInvoker, jsonInvoker);

  if (diffs.length) {
    console.error(`Allowlist drift detected (vs ${path.basename(migrationPath)}):\n`);
    for (const d of diffs) {
      console.error(`[${d.label}]`);
      if (d.onlyA.length) console.error(`  only in migration: ${d.onlyA.join(', ')}`);
      if (d.onlyB.length) console.error(`  only in JSON: ${d.onlyB.join(', ')}`);
    }
    process.exit(1);
  }

  console.log(
    `SECURITY DEFINER allowlists are in sync (${path.basename(migrationPath)} + JSON).`,
  );
}

main();
