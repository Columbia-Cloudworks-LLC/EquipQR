import { describe, expect, it } from 'vitest';
import { parseVitestLocalArgs } from '../../../scripts/lib/parse-vitest-local-args.mjs';

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
});
