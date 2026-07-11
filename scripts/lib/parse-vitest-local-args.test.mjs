import { describe, expect, it } from 'vitest';
import {
  getVitestPathFilters,
  parseVitestLocalArgs,
} from './parse-vitest-local-args.mjs';

describe('parseVitestLocalArgs', () => {
  it('preserves --coverage when --project is absent', () => {
    expect(parseVitestLocalArgs(['--coverage']).passthroughArgs).toEqual(['--coverage']);
  });

  it('preserves a leading path filter when --project is absent', () => {
    expect(parseVitestLocalArgs(['src/lib/utils.test.ts']).passthroughArgs).toEqual([
      'src/lib/utils.test.ts',
    ]);
  });

  it('strips --project and its value only', () => {
    const parsed = parseVitestLocalArgs(['--project', 'unit', '--coverage']);
    expect(parsed.projectFilter).toBe('unit');
    expect(parsed.passthroughArgs).toEqual(['--coverage']);
  });

  it('supports --project=unit form', () => {
    const parsed = parseVitestLocalArgs(['--project=component', '--coverage']);
    expect(parsed.projectFilter).toBe('component');
    expect(parsed.passthroughArgs).toEqual(['--coverage']);
  });
});

describe('getVitestPathFilters', () => {
  it('ignores bare flags and option values', () => {
    expect(getVitestPathFilters(['--coverage', 'default', 'verbose'])).toEqual([]);
  });

  it('keeps test file paths', () => {
    expect(getVitestPathFilters(['--coverage', 'src/lib/utils.test.ts'])).toEqual([
      'src/lib/utils.test.ts',
    ]);
  });
});
