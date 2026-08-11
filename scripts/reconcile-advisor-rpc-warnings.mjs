#!/usr/bin/env node
/**
 * Compare Supabase Advisor function names (one per line) against the post-lockdown
 * allowlist. Use after exporting advisor rows or pasting function names into a file.
 *
 * Usage:
 *   node scripts/reconcile-advisor-rpc-warnings.mjs [path-to-names.txt]
 *
 * With no file, prints the expected advisor surface (intentional warnings).
 */

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const allowlists = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'scripts/security-definer-rpc-allowlists.json'), 'utf8'),
);

const expected = new Set([
  ...allowlists.authenticatedPublicRpc,
  ...allowlists.anonPublicRpc,
  ...allowlists.rlsPredicateHelpers,
]);

const rlsOnly = new Set(allowlists.rlsPredicateHelpers);

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.log('Expected Supabase Advisor SECURITY DEFINER grant surface (intentional):');
    console.log(`  authenticated public RPC: ${allowlists.authenticatedPublicRpc.length}`);
    console.log(`  anon public RPC: ${allowlists.anonPublicRpc.length}`);
    console.log(`  RLS predicate helpers: ${allowlists.rlsPredicateHelpers.length}`);
    console.log(
      `  unique total (auth + anon + RLS helpers): ${expected.size}`,
    );
    console.log('\nRLS helpers (advisor noise, not client RPCs):');
    for (const name of [...rlsOnly].sort()) {
      console.log(`  - ${name}`);
    }
    console.log('\nAnon public RPCs (intentional pre-auth / token resolvers):');
    for (const name of [...allowlists.anonPublicRpc].sort()) {
      console.log(`  - ${name}`);
    }
    return;
  }

  const names = fs
    .readFileSync(path.resolve(inputPath), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const gaps = names.filter((n) => !expected.has(n));
  const missingFromAdvisor = [...expected].filter((n) => !names.includes(n)).sort();

  if (gaps.length) {
    console.error('Functions in advisor export but NOT in allowlist (investigate):');
    for (const g of gaps) console.error(`  - ${g}`);
  } else {
    console.log('All advisor-listed functions are in the intentional allowlist.');
  }

  if (missingFromAdvisor.length) {
    console.log('\nAllowlisted functions not present in advisor export (may be OK if advisor is partial):');
    for (const m of missingFromAdvisor) console.log(`  - ${m}`);
  }

  process.exit(gaps.length ? 1 : 0);
}

main();
