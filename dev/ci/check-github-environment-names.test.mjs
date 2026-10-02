import { spawnSync } from 'node:child_process';
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

describe('preview environment presence script', () => {
  const script = 'dev/ci/assert-preview-env-present.sh';

  it('fails when the preview secret is missing and does not print the variable', () => {
    const result = spawnSync('bash', [script], {
      env: { RESEND_API_KEY: '', SUPABASE_URL: 'https://example.supabase.co' },
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    const output = `${result.stdout}${result.stderr}`;
    expect(output).toContain('RESEND_API_KEY is empty');
    expect(output).not.toContain('example.supabase.co');
  });

  it('passes when both values are set and prints neither', () => {
    const result = spawnSync('bash', [script], {
      env: {
        RESEND_API_KEY: 'secret-value-should-not-appear',
        SUPABASE_URL: 'https://example.supabase.co',
      },
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    const output = `${result.stdout}${result.stderr}`;
    expect(output).toContain('Values were not printed');
    expect(output).not.toContain('secret-value-should-not-appear');
    expect(output).not.toContain('example.supabase.co');
  });
});
