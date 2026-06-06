#!/usr/bin/env node
/**
 * Supabase Migration Validator
 * Checks:
 *   1. Naming convention: YYYYMMDDHHMMSS_description.sql
 *   2. No bare DROP COLUMN without a fallback (DEFAULT or renamed backup)
 *   3. New tables created in migrations have a corresponding CREATE POLICY or ALTER TABLE ... ENABLE ROW LEVEL SECURITY
 *
 * Uses ESM imports — root package.json has "type": "module".
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import {
  escapeRegExp,
  stripSqlCommentsPreserveLength,
  parseAlterTableIdentifier,
  tableIdentifiersMatch,
  findLastAlterTableBefore,
  findStatementEndSemicolon,
  collectDropColumnMatches,
  createTableRegex,
} from '../../scripts/lib/migrationSqlAnalysis.mjs';

const NAMING_REGEX = /^\d{14}_[a-z0-9_]+\.sql$/;

/** Exact reserved names only (avoids prefix matches like authentication_logs vs auth). */
const RPC_ALLOWLIST_PATH = path.join('scripts', 'security-definer-rpc-allowlists.json');
let rpcAnonAllowlist = null;
let rpcAuthenticatedAllowlist = null;
try {
  const rpcAllowlists = JSON.parse(fs.readFileSync(RPC_ALLOWLIST_PATH, 'utf8'));
  rpcAnonAllowlist = rpcAllowlists.anonPublicRpc ?? [];
  rpcAuthenticatedAllowlist = [
    ...(rpcAllowlists.authenticatedPublicRpc ?? []),
    ...(rpcAllowlists.rlsPredicateHelpers ?? []),
  ];
} catch {
  rpcAnonAllowlist = ['get_invitation_by_token_secure'];
  rpcAuthenticatedAllowlist = [];
}

/** Grants EXECUTE/ALL on functions to anon widen the PostgREST attack surface. */
const grantFunctionToAnonRegex =
  /GRANT\s+(?:ALL|EXECUTE)\s+ON\s+FUNCTION\s+[^;]+\s+TO\s+[^;]*\banon\b/gi;

/** Grants EXECUTE/ALL on SECURITY DEFINER functions to authenticated widen REST RPC surface. */
const grantFunctionToAuthenticatedRegex =
  /GRANT\s+(?:ALL|EXECUTE)\s+ON\s+FUNCTION\s+[^;]+\s+TO\s+[^;]*\bauthenticated\b/gi;

const RESERVED_SCHEMA_TABLE_NAMES = new Set([
  'auth',
  'storage',
  'extensions',
  'pgbouncer',
  'realtime',
  'supabase_functions',
]);

const changedFilesEnv = process.env.CHANGED_FILES || '';
const changedFiles = changedFilesEnv
  .split('\n')
  .map((f) => f.trim())
  .filter((f) => f.endsWith('.sql') && f.startsWith('supabase/migrations/'));

function resolveRefIfExists(refName) {
  if (!refName) return null;
  try {
    const resolved = execFileSync('git', ['rev-parse', '--verify', refName], {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
    return resolved || null;
  } catch {
    return null;
  }
}

/**
 * Determine the best-available base commit for "is this migration new?" checks.
 *
 * Priority:
 *  1) PR base merge-base (origin/<GITHUB_BASE_REF> or <GITHUB_BASE_REF>)
 *  2) Push "before" SHA (GITHUB_EVENT_BEFORE) when available
 *  3) HEAD^ as a local fallback
 */
function resolveComparisonBaseCommit() {
  const baseRef = process.env.GITHUB_BASE_REF?.trim();
  if (baseRef) {
    const candidateRef =
      resolveRefIfExists(`origin/${baseRef}`) ||
      resolveRefIfExists(baseRef);

    if (candidateRef) {
      try {
        const mergeBase = execFileSync('git', ['merge-base', 'HEAD', candidateRef], {
          stdio: ['ignore', 'pipe', 'ignore'],
          encoding: 'utf8',
        }).trim();
        if (mergeBase) return mergeBase;
      } catch {
        // fall through to other strategies
      }
    }
  }

  const beforeSha = process.env.GITHUB_EVENT_BEFORE?.trim();
  if (beforeSha && /^[0-9a-f]{40}$/i.test(beforeSha)) {
    const resolvedBefore = resolveRefIfExists(beforeSha);
    if (resolvedBefore) return resolvedBefore;
  }

  return resolveRefIfExists('HEAD^');
}

function fileExistsAtCommit(commitSha, filePath) {
  if (!commitSha) return false;
  try {
    execFileSync('git', ['cat-file', '-e', `${commitSha}:${filePath}`], {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

if (changedFiles.length === 0) {
  console.log('✅ No migration files changed. Skipping validation.');
  process.exit(0);
}

console.log(`\n🔍 Validating ${changedFiles.length} migration file(s)...\n`);

const errors = [];
const warnings = [];
const comparisonBaseCommit = resolveComparisonBaseCommit();
if (comparisonBaseCommit) {
  console.log(`ℹ️  Migration baseline commit: ${comparisonBaseCommit}`);
} else {
  console.log('ℹ️  No baseline commit resolved; defaulting to content checks for changed files.');
}

/** Pre-read all migration bodies once for RLS scans (single build for all changed files). */
let migFileContentsCache = null;
try {
  const allMigrationsDir = path.join('supabase', 'migrations');
  const files = fs.readdirSync(allMigrationsDir).filter((f) => f.endsWith('.sql')).sort();
  migFileContentsCache = files.map((mf) => {
    const rawContent = fs.readFileSync(path.join(allMigrationsDir, mf), 'utf8');
    return stripSqlCommentsPreserveLength(rawContent);
  });
} catch (_) {
  migFileContentsCache = null;
}

for (const filePath of changedFiles) {
  const fileName = path.basename(filePath);
  console.log(`--- Checking: ${fileName}`);

  // ── 1. NAMING CONVENTION ────────────────────────────────────────────────
  if (!NAMING_REGEX.test(fileName)) {
    errors.push(
      `[NAMING] "${fileName}" does not match required pattern: YYYYMMDDHHMMSS_description.sql\n` +
        `  Expected format example: 20260429120000_add_my_table.sql`,
    );
  } else {
    const ts = fileName.slice(0, 14);
    const year = parseInt(ts.slice(0, 4), 10);
    const month = parseInt(ts.slice(4, 6), 10);
    const day = parseInt(ts.slice(6, 8), 10);
    const hour = parseInt(ts.slice(8, 10), 10);
    const minute = parseInt(ts.slice(10, 12), 10);
    const second = parseInt(ts.slice(12, 14), 10);

    if (
      year < 2020 ||
      year > 2099 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31 ||
      hour > 23 ||
      minute > 59 ||
      second > 59
    ) {
      errors.push(`[NAMING] "${fileName}" has an invalid timestamp in the filename.`);
    } else {
      console.log(`  ✅ Naming convention OK`);
    }
  }

  // ── Read file ────────────────────────────────────────────────────────────
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found on disk (may be a deletion). Skipping content checks.`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const analysisContent = stripSqlCommentsPreserveLength(content);

  const migrationIsNew = comparisonBaseCommit
    ? !fileExistsAtCommit(comparisonBaseCommit, filePath)
    : true;

  if (!migrationIsNew) {
    warnings.push(
      `[IMMUTABLE] "${fileName}" already exists at baseline commit ${comparisonBaseCommit.slice(0, 12)} and was modified in-place.\n` +
        `  Applied migrations are immutable in Supabase. Content checks (DROP COLUMN / RLS) were skipped to avoid false conflicts on historical files.\n` +
        `  Prefer a new timestamped migration for follow-up changes.`,
    );
    console.log('  ⚠️  Existing migration detected in baseline; skipping content checks (DROP COLUMN / RLS).');
    continue;
  }

  // ── 1b. ANON FUNCTION GRANT GUARD (issue #762) ───────────────────────────
  const hasAnonGrantMarker = /--\s*rpc-anon-grant-allowed:/i.test(content);
  grantFunctionToAnonRegex.lastIndex = 0;
  if (grantFunctionToAnonRegex.test(analysisContent) && !hasAnonGrantMarker) {
    errors.push(
      `[RPC SECURITY] "${fileName}" grants EXECUTE on a function to role anon.\n` +
        `  Add a reviewed allowlist entry to scripts/security-definer-rpc-allowlists.json and include\n` +
        `  "-- rpc-anon-grant-allowed: <function_name>" in this migration, or revoke anon instead.\n` +
        `  Allowed anon RPC names: ${rpcAnonAllowlist.join(', ')}`,
    );
  } else if (grantFunctionToAnonRegex.test(analysisContent)) {
    console.log('  ✅ Anon function grant has rpc-anon-grant-allowed marker OK');
  }

  // ── 1c. AUTHENTICATED FUNCTION GRANT GUARD (issue #762) ───────────────────
  const hasAuthenticatedGrantMarker =
    /--\s*rpc-authenticated-grant-allowed:/i.test(content) ||
    /--\s*rpc-anon-grant-allowed:.*bulk lockdown/i.test(content);
  grantFunctionToAuthenticatedRegex.lastIndex = 0;
  if (grantFunctionToAuthenticatedRegex.test(analysisContent) && !hasAuthenticatedGrantMarker) {
    errors.push(
      `[RPC SECURITY] "${fileName}" grants EXECUTE on a function to role authenticated.\n` +
        `  Add the function to scripts/security-definer-rpc-allowlists.json and include\n` +
        `  "-- rpc-authenticated-grant-allowed: <function_name>" in this migration, or rely on\n` +
        `  the bulk lockdown migration instead of per-function GRANTs.\n` +
        `  Reviewed authenticated/RLS helper names: ${[...new Set(rpcAuthenticatedAllowlist)].slice(0, 8).join(', ')}${rpcAuthenticatedAllowlist.length > 8 ? ', ...' : ''}`,
    );
  } else if (grantFunctionToAuthenticatedRegex.test(analysisContent)) {
    console.log('  ✅ Authenticated function grant has rpc-authenticated-grant-allowed marker OK');
  }

  // ── 2. DROP COLUMN SAFETY CHECK ─────────────────────────────────────────
  /**
   * Validate a single DROP COLUMN occurrence.
   * `matchIndex` is where the match starts (for comment checks and rename lookahead).
   */
  function checkDropColumn(columnName, matchIndex) {
    if (!columnName) return;

    const alterStart = findLastAlterTableBefore(analysisContent, matchIndex + 1);
    if (alterStart < 0) return;

    const semi = findStatementEndSemicolon(analysisContent, alterStart);
    const alterStatement = analysisContent.slice(alterStart, semi + 1);
    const currentTable = parseAlterTableIdentifier(alterStatement);
    const renameRegex = new RegExp(
      `RENAME\\s+COLUMN\\s+(?:"${escapeRegExp(columnName)}"|${escapeRegExp(columnName)})\\b`,
      'i',
    );
    const hasRenameInSameStatement = renameRegex.test(alterStatement);

    let hasRenameInPreviousStatement = false;
    const previousAlterStart = findLastAlterTableBefore(analysisContent, alterStart);
    if (previousAlterStart >= 0) {
      const previousSemi = findStatementEndSemicolon(analysisContent, previousAlterStart);
      const previousStatement = analysisContent.slice(previousAlterStart, previousSemi + 1);
      const previousTable = parseAlterTableIdentifier(previousStatement);
      hasRenameInPreviousStatement =
        tableIdentifiersMatch(currentTable, previousTable) && renameRegex.test(previousStatement);
    }

    const hasRename = hasRenameInSameStatement || hasRenameInPreviousStatement;

    const rawSemi = findStatementEndSemicolon(content, alterStart);
    // Include the line immediately before ALTER TABLE so that a suppression
    // comment placed on the preceding line (the documented pattern) is detected.
    const alterLineStart = content.lastIndexOf('\n', alterStart - 1) + 1;
    let sliceStart = 0;
    if (alterLineStart > 0) {
      const prevNewline = content.lastIndexOf('\n', alterLineStart - 2);
      sliceStart = prevNewline >= 0 ? prevNewline + 1 : 0;
    }
    const safeCommentSlice = content.slice(sliceStart, rawSemi + 1);
    const hasSafeComment = /--\s*(safe.?drop|intentional.?drop|acknowledged)/i.test(
      safeCommentSlice,
    );

    if (!hasRename && !hasSafeComment) {
      errors.push(
        `[DROP COLUMN] "${fileName}" drops column "${columnName}" without a rename-backup or safety comment.\n` +
          `  To suppress: add a comment "-- safe-drop" or "-- intentional-drop" near the statement,\n` +
          `  or RENAME the column to a _deprecated suffix first.`,
      );
    } else {
      console.log(`  ✅ DROP COLUMN "${columnName}" has fallback/acknowledgment OK`);
    }
  }

  const dropMatches = collectDropColumnMatches(analysisContent);
  for (const { index: dropIdx, groups: dropMatch } of dropMatches) {
    const columnName =
      dropMatch[1] || dropMatch[2] || dropMatch[3] || dropMatch[4];
    checkDropColumn(columnName, dropIdx);
  }

  // ── 3. NEW TABLES REQUIRE RLS ────────────────────────────────────────────
  // Use comment-stripped SQL so CREATE TABLE inside `--` or `/* */` comments cannot
  // satisfy or spoof this check (matches RLS / DROP COLUMN analysis behavior).
  let createMatch;
  createTableRegex.lastIndex = 0;
  while ((createMatch = createTableRegex.exec(analysisContent)) !== null) {
    const schemaName = (createMatch[1] || createMatch[2] || '').replace(/"/g, '');
    const rawTableName = (createMatch[3] || createMatch[4] || '').replace(/"/g, '');
    if (!rawTableName) continue;
    if (schemaName && schemaName.toLowerCase() !== 'public') {
      console.log(
        `  ⏭️  Skipping RLS check for ${schemaName}.${rawTableName} (non-public schema)`,
      );
      continue;
    }
    if (RESERVED_SCHEMA_TABLE_NAMES.has(rawTableName.toLowerCase())) continue;

    const escaped = escapeRegExp(rawTableName);
    const rlsEnabledRegex = new RegExp(
      `ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:(?:"public"|public)\\s*\\.\\s*)?(?:"${escaped}"|${escaped})\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
      'i',
    );
    const policyRegex = new RegExp(
      `CREATE\\s+POLICY\\s+(?:[\\w]+|"[^"]+")\\s+ON\\s+(?:(?:"public"|public)\\s*\\.\\s*)?(?:"${escaped}"|\\b${escaped}\\b)`,
      'i',
    );

    let hasGlobalRLS = false;
    let hasGlobalPolicy = false;

    if (migFileContentsCache !== null) {
      for (const mc of migFileContentsCache) {
        rlsEnabledRegex.lastIndex = 0;
        policyRegex.lastIndex = 0;
        if (!hasGlobalRLS && rlsEnabledRegex.test(mc)) hasGlobalRLS = true;
        if (!hasGlobalPolicy && policyRegex.test(mc)) hasGlobalPolicy = true;
        if (hasGlobalRLS && hasGlobalPolicy) break;
      }
    } else {
      rlsEnabledRegex.lastIndex = 0;
      policyRegex.lastIndex = 0;
      if (rlsEnabledRegex.test(analysisContent)) hasGlobalRLS = true;
      if (policyRegex.test(analysisContent)) hasGlobalPolicy = true;
    }

    if (!hasGlobalRLS) {
      errors.push(
        `[RLS] Table "${rawTableName}" created in "${fileName}" is missing:\n` +
          `  ALTER TABLE ${rawTableName} ENABLE ROW LEVEL SECURITY;\n` +
          `  (Not found in any migration file)`,
      );
    } else if (!hasGlobalPolicy) {
      warnings.push(
        `[RLS] Table "${rawTableName}" has RLS enabled but no CREATE POLICY found in any migration.\n` +
          `  This will block ALL access — add at least one policy.`,
      );
    } else {
      console.log(`  ✅ Table "${rawTableName}" has RLS + policy OK`);
    }
  }
}

// ── REPORT ─────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60));

if (warnings.length > 0) {
  console.warn('\n⚠️  WARNINGS:');
  warnings.forEach((w, i) => console.warn(`  ${i + 1}. ${w}`));
}

if (errors.length > 0) {
  console.error('\n❌ ERRORS:');
  errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}`));
  console.error(`\n🚫 Migration validation FAILED with ${errors.length} error(s).`);
  process.exit(1);
} else {
  console.log('\n✅ All migration validations passed!');
  process.exit(0);
}
