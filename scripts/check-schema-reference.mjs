#!/usr/bin/env node

/**
 * Schema Reference Freshness Check (#1182)
 *
 * `supabase/current_schema.sql` is a derived artifact: a full dump of the
 * schema produced by applying every migration in `supabase/migrations/`.
 * It must be regenerated and committed together with any schema-changing
 * migration, otherwise the reference file silently drifts from reality.
 *
 * PR gate (when SCHEMA_REFERENCE_BASE_SHA is set):
 * - Only enforced when the PR actually touches `supabase/migrations/*.sql`,
 *   so unrelated PRs can never false-positive.
 * - Migrations containing the `-- schema-reference: skip` marker (pure data
 *   migrations) do not require a regenerated dump.
 * - Fails when schema-affecting migrations changed but
 *   `supabase/current_schema.sql` did not change in the same diff.
 *
 * Local/main invariant (no base SHA):
 * - Git-history comparison: the last commit touching `supabase/migrations/`
 *   must not be newer than the last commit touching the reference file.
 *
 * No database is required — the check is entirely git-based.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const SCHEMA_REFERENCE_PATH = 'supabase/current_schema.sql';
export const DATA_ONLY_MARKER = '-- schema-reference: skip';

const MIGRATIONS_DIR = 'supabase/migrations';

const REGENERATION_HINT = [
  'Regenerate the schema reference dump and commit it with your migration:',
  '  1. .\\dev-start.bat -Force   (or: npx supabase db reset)',
  '  2. npx supabase db dump --local -f supabase/current_schema.sql',
  '  3. git add supabase/current_schema.sql',
  `Pure data migrations may opt out with a "${DATA_ONLY_MARKER}" comment line.`,
].join('\n');

/** @param {string} filePath */
export function isMigrationSqlPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.startsWith(`${MIGRATIONS_DIR}/`) && normalized.endsWith('.sql');
}

/** @param {string | null} sql */
export function isDataOnlyMigration(sql) {
  if (sql == null) {
    // Deleted/unreadable migrations still change what the migration chain
    // produces, so they require a regenerated reference dump.
    return false;
  }
  return sql
    .split(/\r?\n/)
    .some((line) => line.trim().toLowerCase() === DATA_ONLY_MARKER.toLowerCase());
}

/**
 * Pure decision logic (unit-tested in scripts/check-schema-reference.test.ts).
 *
 * @param {{
 *   referenceExists: boolean;
 *   changedFiles: string[] | null;
 *   readMigration: (filePath: string) => string | null;
 *   migrationsLastCommitEpoch?: number | null;
 *   referenceLastCommitEpoch?: number | null;
 * }} input
 * @returns {{ ok: boolean; reason: string }}
 */
export function evaluateSchemaReference(input) {
  if (!input.referenceExists) {
    return {
      ok: false,
      reason:
        `${SCHEMA_REFERENCE_PATH} is missing. The schema reference dump must exist `
        + `and stay current with ${MIGRATIONS_DIR}/.\n${REGENERATION_HINT}`,
    };
  }

  if (input.changedFiles != null) {
    const changed = input.changedFiles.map((file) => file.replace(/\\/g, '/'));
    const changedMigrations = changed.filter(isMigrationSqlPath);

    if (changedMigrations.length === 0) {
      return { ok: true, reason: 'No migration changes in this diff — schema reference not required.' };
    }

    const schemaAffecting = changedMigrations.filter(
      (file) => !isDataOnlyMigration(input.readMigration(file)),
    );

    if (schemaAffecting.length === 0) {
      return {
        ok: true,
        reason: `All ${changedMigrations.length} changed migration(s) are marked "${DATA_ONLY_MARKER}".`,
      };
    }

    if (changed.includes(SCHEMA_REFERENCE_PATH)) {
      return {
        ok: true,
        reason: `${SCHEMA_REFERENCE_PATH} was regenerated alongside `
          + `${schemaAffecting.length} schema-affecting migration(s).`,
      };
    }

    return {
      ok: false,
      reason:
        `Schema-affecting migration(s) changed without regenerating ${SCHEMA_REFERENCE_PATH}:\n`
        + schemaAffecting.map((file) => `  - ${file}`).join('\n')
        + `\n${REGENERATION_HINT}`,
    };
  }

  const migrationsEpoch = input.migrationsLastCommitEpoch ?? 0;
  const referenceEpoch = input.referenceLastCommitEpoch ?? 0;

  if (migrationsEpoch > referenceEpoch) {
    return {
      ok: false,
      reason:
        `${MIGRATIONS_DIR}/ was last modified after ${SCHEMA_REFERENCE_PATH} `
        + `(migrations commit ${migrationsEpoch} > reference commit ${referenceEpoch}). `
        + `The schema reference dump is stale.\n${REGENERATION_HINT}`,
    };
  }

  return { ok: true, reason: 'Schema reference dump is at least as new as the latest migration commit.' };
}

/** @param {string} baseSha */
function listChangedFiles(baseSha) {
  const output = execFileSync(
    'git',
    ['diff', '--name-only', `${baseSha}..HEAD`],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** @param {string} trackedPath */
function lastCommitEpoch(trackedPath) {
  const output = execFileSync(
    'git',
    ['log', '-1', '--format=%ct', '--', trackedPath],
    { cwd: repoRoot, encoding: 'utf8' },
  ).trim();
  return output ? Number.parseInt(output, 10) : null;
}

function checkSchemaReference(options = {}) {
  const baseSha = options.baseSha ?? process.env.SCHEMA_REFERENCE_BASE_SHA ?? '';
  const referenceExists = fs.existsSync(path.join(repoRoot, SCHEMA_REFERENCE_PATH));

  const result = evaluateSchemaReference({
    referenceExists,
    changedFiles: baseSha ? listChangedFiles(baseSha) : null,
    readMigration: (filePath) => {
      try {
        return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
      } catch {
        return null;
      }
    },
    migrationsLastCommitEpoch: baseSha ? null : lastCommitEpoch(MIGRATIONS_DIR),
    referenceLastCommitEpoch: baseSha ? null : lastCommitEpoch(SCHEMA_REFERENCE_PATH),
  });

  if (!result.ok) {
    console.error(`check-schema-reference: FAIL\n${result.reason}`);
    process.exit(1);
  }

  console.log(`check-schema-reference: OK — ${result.reason}`);
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  checkSchemaReference();
}
