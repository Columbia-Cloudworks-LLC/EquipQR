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

const NAMING_REGEX = /^\d{14}_[a-z0-9_]+\.sql$/;

/** Exact reserved names only (avoids prefix matches like authentication_logs vs auth). */
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

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True if the line containing `index` starts with `--` (SQL line comment). */
function isLineSqlComment(content, index) {
  const lineStart = content.lastIndexOf('\n', index - 1) + 1;
  return content.slice(lineStart, index).trimStart().startsWith('--');
}

if (changedFiles.length === 0) {
  console.log('✅ No migration files changed. Skipping validation.');
  process.exit(0);
}

console.log(`\n🔍 Validating ${changedFiles.length} migration file(s)...\n`);

const errors = [];
const warnings = [];

/*
 * CREATE TABLE — captures optional schema prefix and table name in separate groups.
 * Groups [1]/[2] = schema (quoted/unquoted), [3]/[4] = table name (quoted/unquoted).
 * Non-public schemas are skipped during processing to avoid false positives.
 */
const createTableRegex =
  /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:(?:"([^"]+)"|([a-z_][a-z0-9_]*))\s*\.\s*)?(?:"([^"]+)"|([a-z_][a-z0-9_]*))/gi;

/*
 * DROP COLUMN — must not use a single optional IF EXISTS before (\w+) or "IF" is captured as the column name.
 * Branches: IF EXISTS col | col (quoted or word).
 */
const dropColumnRegex =
  /ALTER\s+TABLE\s+[\w".]+\s+DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+(?:"([^"]+)"|(\w+))|(?:"([^"]+)"|(\w+)))/gi;

/*
 * Additional DROP COLUMN clauses within the same ALTER TABLE statement (multi-column form).
 * Matches ", DROP COLUMN [IF EXISTS] col" that follow the first DROP COLUMN already caught above.
 */
const additionalDropColumnRegex =
  /,\s*DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+(?:"([^"]+)"|(\w+))|(?:"([^"]+)"|(\w+)))/gi;

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

  // ── 2. DROP COLUMN SAFETY CHECK ─────────────────────────────────────────
  /**
   * Helper: validate a single DROP COLUMN occurrence.
   * `matchIndex` is the position in `content` where the DROP keyword starts
   * (used for comment-proximity checks and preceding-rename lookups).
   */
  function checkDropColumn(columnName, matchIndex) {
    const precedingContent = content.slice(0, matchIndex);
    const hasRename = new RegExp(
      `RENAME\\s+COLUMN\\s+${escapeRegExp(columnName)}`,
      'i',
    ).test(precedingContent);
    const hasSafeComment = /--\s*(safe.?drop|intentional.?drop|acknowledged)/i.test(
      content.slice(Math.max(0, matchIndex - 200), matchIndex + 200),
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

  let dropMatch;
  dropColumnRegex.lastIndex = 0;
  while ((dropMatch = dropColumnRegex.exec(content)) !== null) {
    if (isLineSqlComment(content, dropMatch.index)) continue;

    const columnName =
      dropMatch[1] || dropMatch[2] || dropMatch[3] || dropMatch[4];
    checkDropColumn(columnName, dropMatch.index);

    // Check any additional ", DROP COLUMN ..." clauses in the same statement.
    // Scan forward from end of this match until the statement terminator (;).
    const stmtEnd = content.indexOf(';', dropMatch.index);
    const tail =
      stmtEnd === -1
        ? content.slice(dropMatch.index + dropMatch[0].length)
        : content.slice(dropMatch.index + dropMatch[0].length, stmtEnd + 1);

    additionalDropColumnRegex.lastIndex = 0;
    let extraMatch;
    while ((extraMatch = additionalDropColumnRegex.exec(tail)) !== null) {
      const extraColumn =
        extraMatch[1] || extraMatch[2] || extraMatch[3] || extraMatch[4];
      // Compute absolute position of this extra DROP COLUMN in `content`.
      const absoluteIndex =
        dropMatch.index + dropMatch[0].length + extraMatch.index;
      if (isLineSqlComment(content, absoluteIndex)) continue;
      checkDropColumn(extraColumn, absoluteIndex);
    }
  }

  // ── 3. NEW TABLES REQUIRE RLS ────────────────────────────────────────────
  let createMatch;
  createTableRegex.lastIndex = 0;
  while ((createMatch = createTableRegex.exec(content)) !== null) {
    if (isLineSqlComment(content, createMatch.index)) continue;

    // Groups [1]/[2] are the schema; [3]/[4] are the table name.
    const schemaName = (createMatch[1] || createMatch[2] || '').toLowerCase();
    // If a non-public schema is present, skip RLS validation for this table.
    if (schemaName && schemaName !== 'public') continue;

    const rawTableName = (createMatch[3] || createMatch[4] || '').replace(/"/g, '');
    if (!rawTableName) continue;
    if (RESERVED_SCHEMA_TABLE_NAMES.has(rawTableName.toLowerCase())) continue;

    const escaped = escapeRegExp(rawTableName);
    const rlsEnabledRegex = new RegExp(
      `ALTER\\s+TABLE\\s+(?:(?:"public"|public)\\s*\\.\\s*)?(?:"${escaped}"|${escaped})\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
      'i',
    );
    const policyRegex = new RegExp(
      `CREATE\\s+POLICY\\s+(?:[\\w]+|"[^"]+")\\s+ON\\s+(?:(?:"public"|public)\\s*\\.\\s*)?(?:"${escaped}"|\\b${escaped}\\b)`,
      'i',
    );

    const allMigrationsDir = path.join('supabase', 'migrations');
    let hasGlobalRLS = false;
    let hasGlobalPolicy = false;

    try {
      const allMigFiles = fs
        .readdirSync(allMigrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      for (const mf of allMigFiles) {
        const mc = fs.readFileSync(path.join(allMigrationsDir, mf), 'utf8');
        rlsEnabledRegex.lastIndex = 0;
        policyRegex.lastIndex = 0;
        if (rlsEnabledRegex.test(mc)) hasGlobalRLS = true;
        if (policyRegex.test(mc)) hasGlobalPolicy = true;
      }
    } catch (_) {
      rlsEnabledRegex.lastIndex = 0;
      policyRegex.lastIndex = 0;
      if (rlsEnabledRegex.test(content)) hasGlobalRLS = true;
      if (policyRegex.test(content)) hasGlobalPolicy = true;
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
