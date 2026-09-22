import { describe, expect, it } from 'vitest';
import { expectedSecretNames, missingSecretNames } from './check-github-environment-names.mjs';

describe('github environment secret names', () => {
  it('reports every missing production and preview name', () => {
    expect(missingSecretNames({ production: new Set(), preview: new Set() })).toEqual([
      ...expectedSecretNames.production.map((name) => `production/${name}`),
      ...expectedSecretNames.preview.map((name) => `preview/${name}`),
    ]);
  });

  it('accepts a complete name set and ignores extra names', () => {
    const present = {
      production: new Set([...expectedSecretNames.production, 'EXTRA']),
      preview: new Set(expectedSecretNames.preview),
    };
    expect(missingSecretNames(present)).toEqual([]);
  });

  it('keeps the production database password out of the preview list', () => {
    expect(expectedSecretNames.preview).not.toContain('SUPABASE_DB_PASSWORD');
    expect(expectedSecretNames.production).toContain('SUPABASE_DB_PASSWORD');
  });
});
