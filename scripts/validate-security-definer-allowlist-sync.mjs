#!/usr/bin/env node
/**
 * Ensures SECURITY DEFINER RPC allowlists stay aligned across:
 * - scripts/security-definer-rpc-allowlists.json
 * - supabase/migrations/20260602120000_lockdown_security_definer_rpc_grants.sql
 *
 * Usage: node scripts/validate-security-definer-allowlist-sync.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const jsonPath = path.join(repoRoot, 'scripts/security-definer-rpc-allowlists.json');
const migrationPath = path.join(
  repoRoot,
  'supabase/migrations/20260602120000_lockdown_security_definer_rpc_grants.sql',
);

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
  const migration = fs.readFileSync(migrationPath, 'utf8');

  const migrationAuth = extractArray(migration, 'authenticated_allowlist');
  const migrationAnon = extractArray(migration, 'anon_allowlist');
  const migrationRls = extractArray(migration, 'rls_helper_allowlist');

  const jsonAuth = [...allowlists.authenticatedPublicRpc].sort();
  const jsonAnon = [...allowlists.anonPublicRpc].sort();
  const jsonRls = [...allowlists.rlsPredicateHelpers].sort();

  const diffs = [];
  const warnings = [];

  function compare(label, a, b, options = {}) {
    const onlyA = a.filter((x) => !b.includes(x));
    const onlyB = b.filter((x) => !a.includes(x));
    const shouldFail = onlyA.length > 0 || (!options.allowJsonSuperset && onlyB.length > 0);

    if (shouldFail) {
      diffs.push({ label, onlyA, onlyB });
    } else if (options.allowJsonSuperset && onlyB.length > 0) {
      warnings.push({ label, onlyB });
    }
  }

  compare('authenticatedPublicRpc', migrationAuth, jsonAuth, { allowJsonSuperset: true });
  compare('anonPublicRpc', migrationAnon, jsonAnon);
  compare('rlsPredicateHelpers', migrationRls, jsonRls);

  if (warnings.length) {
    console.warn('Allowlist JSON superset (informational):\n');
    for (const w of warnings) {
      console.warn(`[${w.label}] only in JSON: ${w.onlyB.join(', ')}`);
    }
  }

  if (diffs.length) {
    console.error('Allowlist drift detected:\n');
    for (const d of diffs) {
      console.error(`[${d.label}]`);
      if (d.onlyA.length) console.error(`  only in migration: ${d.onlyA.join(', ')}`);
      if (d.onlyB.length) console.error(`  only in JSON: ${d.onlyB.join(', ')}`);
    }
    process.exit(1);
  }

  console.log('SECURITY DEFINER allowlists are in sync (migration + JSON).');
}

main();
