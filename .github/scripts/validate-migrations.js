#!/usr/bin/env node
/**
 * Supabase Migration Validator
 * Checks:
 *   1. Naming convention: YYYYMMDDHHMMSS_description.sql
 *   2. No bare DROP COLUMN without a fallback (DEFAULT or renamed backup)
 *   3. New tables created in migrations have a corresponding CREATE POLICY or ALTER TABLE ... ENABLE ROW LEVEL SECURITY
 */

const fs = require('fs');
const path = require('path');

const NAMING_REGEX = /^\d{14}_[a-z0-9_]+\.sql$/;

const changedFilesEnv = process.env.CHANGED_FILES || '';
const changedFiles = changedFilesEnv
  .split('\n')
  .map(f => f.trim())
  .filter(f => f.endsWith('.sql') && f.startsWith('supabase/migrations/'));

if (changedFiles.length === 0) {
  console.log('✅ No migration files changed. Skipping validation.');
  process.exit(0);
}

console.log(`\n🔍 Validating ${changedFiles.length} migration file(s)...\n`);

const errors = [];
const warnings = [];

for (const filePath of changedFiles) {
  const fileName = path.basename(filePath);
  console.log(`--- Checking: ${fileName}`);

  // ── 1. NAMING CONVENTION ────────────────────────────────────────────────
  if (!NAMING_REGEX.test(fileName)) {
    errors.push(
      `[NAMING] "${fileName}" does not match required pattern: YYYYMMDDHHMMSS_description.sql\n` +
      `  Expected format example: 20260429120000_add_my_table.sql`
    );
  } else {
    const ts = fileName.slice(0, 14);
    const year   = parseInt(ts.slice(0, 4), 10);
    const month  = parseInt(ts.slice(4, 6), 10);
    const day    = parseInt(ts.slice(6, 8), 10);
    const hour   = parseInt(ts.slice(8, 10), 10);
    const minute = parseInt(ts.slice(10, 12), 10);
    const second = parseInt(ts.slice(12, 14), 10);

    if (
      year < 2020 || year > 2099 ||
      month < 1 || month > 12 ||
      day < 1 || day > 31 ||
      hour > 23 || minute > 59 || second > 59
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
  const upperContent = content.toUpperCase();
  const lines = content.split('\n');

  // ── 2. DROP COLUMN SAFETY CHECK ─────────────────────────────────────────
  //
  // Bare DROP COLUMN is destructive. We require one of:
  //   a) A preceding ALTER TABLE ... RENAME COLUMN (backup pattern)
  //   b) A DEFAULT value being set before the drop on the same table/column
  //   c) A comment -- safe-drop or -- intentional-drop acknowledging the risk
  //
  const dropColumnRegex = /ALTER\s+TABLE\s+[\w".]+\s+DROP\s+COLUMN\s+(\w+)/gi;
  let dropMatch;
  while ((dropMatch = dropColumnRegex.exec(content)) !== null) {
    const columnName = dropMatch[1];
    const precedingContent = content.slice(0, dropMatch.index);

    const hasRename = new RegExp(`RENAME\\s+COLUMN\\s+${columnName}`, 'i').test(precedingContent);
    const hasSafeComment = /--\s*(safe.?drop|intentional.?drop|acknowledged)/i.test(
      content.slice(Math.max(0, dropMatch.index - 200), dropMatch.index + 200)
    );

    if (!hasRename && !hasSafeComment) {
      errors.push(
        `[DROP COLUMN] "${fileName}" drops column "${columnName}" without a rename-backup or safety comment.\n` +
        `  To suppress: add a comment "-- safe-drop" or "-- intentional-drop" near the statement,\n` +
        `  or RENAME the column to a _deprecated suffix first.`
      );
    } else {
      console.log(`  ✅ DROP COLUMN "${columnName}" has fallback/acknowledgment OK`);
    }
  }

  // ── 3. NEW TABLES REQUIRE RLS ────────────────────────────────────────────
  //
  // If the migration creates a new table, verify it also:
  //   a) Enables RLS:          ALTER TABLE <name> ENABLE ROW LEVEL SECURITY
  //   b) Creates at least one policy:  CREATE POLICY ... ON <name>
  //
  // We only flag tables in the public schema (default) and skip auth.* / storage.*
  //
  const createTableRegex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\s*\.\s*)?("?[a-z_][a-z0-9_]*"?)/gi;
  let createMatch;
  const skipSchemas = /^(auth|storage|extensions|pgbouncer|realtime|supabase_functions)/i;

  while ((createMatch = createTableRegex.exec(content)) !== null) {
    const rawTableName = createMatch[1].replace(/"/g, '');

    // Skip internal schemas if accidentally matched
    if (skipSchemas.test(rawTableName)) continue;

    const rlsEnabledRegex = new RegExp(
      `ALTER\\s+TABLE\\s+(?:public\\s*\\.\\s*)?"?${rawTableName}"?\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
      'i'
    );
    const policyRegex = new RegExp(
      `CREATE\\s+POLICY\\s+[\\w"]+\\s+ON\\s+(?:public\\s*\\.\\s*)?"?${rawTableName}"?`,
      'i'
    );

    // Also check entire migrations folder for this table's RLS (in case it was set in an earlier migration)
    const allMigrationsDir = path.join('supabase', 'migrations');
    let hasGlobalRLS = false;
    let hasGlobalPolicy = false;

    try {
      const allMigFiles = fs.readdirSync(allMigrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      for (const mf of allMigFiles) {
        const mc = fs.readFileSync(path.join(allMigrationsDir, mf), 'utf8');
        if (rlsEnabledRegex.test(mc)) hasGlobalRLS = true;
        if (policyRegex.test(mc)) hasGlobalPolicy = true;
      }
    } catch (_) {
      // fallback: only check current file
      if (rlsEnabledRegex.test(content)) hasGlobalRLS = true;
      if (policyRegex.test(content)) hasGlobalPolicy = true;
    }

    if (!hasGlobalRLS) {
      errors.push(
        `[RLS] Table "${rawTableName}" created in "${fileName}" is missing:\n` +
        `  ALTER TABLE ${rawTableName} ENABLE ROW LEVEL SECURITY;\n` +
        `  (Not found in any migration file)`
      );
    } else if (!hasGlobalPolicy) {
      warnings.push(
        `[RLS] Table "${rawTableName}" has RLS enabled but no CREATE POLICY found in any migration.\n` +
        `  This will block ALL access — add at least one policy.`
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
