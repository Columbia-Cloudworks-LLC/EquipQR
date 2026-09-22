import { describe, expect, it } from 'vitest';
import { assertMigrationName } from './new-migration.mjs';

describe('migration name guard', () => {
  it('accepts snake_case', () => {
    expect(() => assertMigrationName('add_operator_checkins')).not.toThrow();
  });

  it('rejects names that are not migration slugs', () => {
    expect(() => assertMigrationName('Add-Thing')).toThrow(/snake_case/);
    expect(() => assertMigrationName('1bad')).toThrow(/snake_case/);
  });
});
