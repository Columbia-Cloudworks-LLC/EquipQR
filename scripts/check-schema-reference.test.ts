import { describe, it, expect } from 'vitest';
import {
  DATA_ONLY_MARKER,
  SCHEMA_REFERENCE_PATH,
  evaluateSchemaReference,
  isDataOnlyMigration,
  isMigrationSqlPath,
} from './check-schema-reference.mjs';

const readNothing = () => null;

describe('isMigrationSqlPath', () => {
  it('matches SQL files under supabase/migrations', () => {
    expect(isMigrationSqlPath('supabase/migrations/20260707120000_add_table.sql')).toBe(true);
    expect(isMigrationSqlPath('supabase\\migrations\\20260707120000_add_table.sql')).toBe(true);
  });

  it('ignores non-migration paths', () => {
    expect(isMigrationSqlPath('supabase/seeds/generated/50_generated_equipment.sql')).toBe(false);
    expect(isMigrationSqlPath('supabase/migrations/README.md')).toBe(false);
    expect(isMigrationSqlPath(SCHEMA_REFERENCE_PATH)).toBe(false);
  });
});

describe('isDataOnlyMigration', () => {
  it('detects the skip marker on its own line', () => {
    expect(isDataOnlyMigration(`${DATA_ONLY_MARKER}\nUPDATE t SET x = 1;`)).toBe(true);
    expect(isDataOnlyMigration(`  ${DATA_ONLY_MARKER.toUpperCase()}  \nUPDATE t SET x = 1;`)).toBe(true);
  });

  it('treats unreadable (deleted) migrations as schema-affecting', () => {
    expect(isDataOnlyMigration(null)).toBe(false);
  });

  it('does not match ordinary SQL', () => {
    expect(isDataOnlyMigration('CREATE TABLE public.example (id uuid);')).toBe(false);
  });
});

describe('evaluateSchemaReference (PR diff mode)', () => {
  it('fails when the reference dump is missing', () => {
    const result = evaluateSchemaReference({
      referenceExists: false,
      changedFiles: [],
      readMigration: readNothing,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain(`${SCHEMA_REFERENCE_PATH} is missing`);
  });

  it('passes trivially when the PR contains no migration changes', () => {
    const result = evaluateSchemaReference({
      referenceExists: true,
      changedFiles: ['src/App.tsx', 'docs/ops/migrations.md'],
      readMigration: readNothing,
    });
    expect(result.ok).toBe(true);
  });

  it('fails when a schema-affecting migration changes without a regenerated dump', () => {
    const result = evaluateSchemaReference({
      referenceExists: true,
      changedFiles: ['supabase/migrations/20260707120000_add_table.sql'],
      readMigration: () => 'CREATE TABLE public.example (id uuid PRIMARY KEY);',
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('20260707120000_add_table.sql');
    expect(result.reason).toContain('npx supabase db dump --local');
  });

  it('passes when the dump is regenerated in the same diff', () => {
    const result = evaluateSchemaReference({
      referenceExists: true,
      changedFiles: [
        'supabase/migrations/20260707120000_add_table.sql',
        SCHEMA_REFERENCE_PATH,
      ],
      readMigration: () => 'CREATE TABLE public.example (id uuid PRIMARY KEY);',
    });
    expect(result.ok).toBe(true);
  });

  it('passes when every changed migration is marked data-only', () => {
    const result = evaluateSchemaReference({
      referenceExists: true,
      changedFiles: ['supabase/migrations/20260707120000_backfill_rows.sql'],
      readMigration: () => `${DATA_ONLY_MARKER}\nUPDATE public.example SET x = 1;`,
    });
    expect(result.ok).toBe(true);
  });

  it('fails when a deleted migration cannot be read back', () => {
    const result = evaluateSchemaReference({
      referenceExists: true,
      changedFiles: ['supabase/migrations/20260101000000_removed.sql'],
      readMigration: readNothing,
    });
    expect(result.ok).toBe(false);
  });
});

describe('evaluateSchemaReference (git history fallback mode)', () => {
  it('fails when migrations were committed after the reference dump', () => {
    const result = evaluateSchemaReference({
      referenceExists: true,
      changedFiles: null,
      readMigration: readNothing,
      migrationsLastCommitEpoch: 2_000,
      referenceLastCommitEpoch: 1_000,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('stale');
  });

  it('passes when the reference commit is as new as the migrations commit', () => {
    const result = evaluateSchemaReference({
      referenceExists: true,
      changedFiles: null,
      readMigration: readNothing,
      migrationsLastCommitEpoch: 1_500,
      referenceLastCommitEpoch: 1_500,
    });
    expect(result.ok).toBe(true);
  });
});
