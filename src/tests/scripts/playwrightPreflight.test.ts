import { describe, expect, it } from 'vitest';
import { evaluatePreflight } from '../../../scripts/lib/playwrightPreflight.mjs';

describe('evaluatePreflight', () => {
  it('passes when browser exists and storage state is optional', () => {
    const result = evaluatePreflight({
      browserExecutableExists: true,
      executablePath: 'C:/fake/chromium.exe',
      requireStorageState: false,
      storageStatePath: null,
      storageStateExists: false
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
  });

  it('fails when browser executable is missing', () => {
    const result = evaluatePreflight({
      browserExecutableExists: false,
      executablePath: 'C:/missing/chromium.exe',
      requireStorageState: false,
      storageStatePath: null,
      storageStateExists: false
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toMatch(/install chromium/i);
  });

  it('fails when production requires storage but DEMO_STORAGE_STATE is not provided', () => {
    const result = evaluatePreflight({
      browserExecutableExists: true,
      executablePath: 'C:/fake/chromium.exe',
      requireStorageState: true,
      storageStatePath: null,
      storageStateExists: false
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toMatch(/DEMO_STORAGE_STATE is required/i);
  });

  it('fails when storage path is provided but missing', () => {
    const result = evaluatePreflight({
      browserExecutableExists: true,
      executablePath: 'C:/fake/chromium.exe',
      requireStorageState: true,
      storageStatePath: 'tmp/demos/auth.json',
      storageStateExists: false
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toMatch(/points to a missing file/i);
  });
});
