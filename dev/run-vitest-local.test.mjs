import { describe, expect, it } from 'vitest';
import {
  getVitestPathFilters,
  parseReporterArgs,
  parseTestRunnerArgs,
  parseVitestLocalArgs,
} from './lib/parse-vitest-local-args.mjs';

describe('parseTestRunnerArgs', () => {
  it('defaults to local mode and strips --local flag', () => {
    expect(parseTestRunnerArgs(['--local', '--project', 'unit'])).toEqual({
      mode: 'local',
      localArgs: ['--project', 'unit'],
    });
  });

  it('selects ci mode when --ci is passed', () => {
    expect(parseTestRunnerArgs(['--ci'])).toEqual({
      mode: 'ci',
      localArgs: [],
    });
  });

  it('selects shard mode when --shard=N/M is passed', () => {
    expect(parseTestRunnerArgs(['--shard=2/4'])).toEqual({
      mode: 'shard',
      shard: '--shard=2/4',
      shardIndex: 2,
      shardTotal: 4,
      localArgs: [],
    });
  });

  it('throws on invalid --shard value', () => {
    expect(() => parseTestRunnerArgs(['--shard=5/4'])).toThrow('Invalid --shard=5/4 argument');
    expect(() => parseTestRunnerArgs(['--shard=abc'])).toThrow('Invalid --shard=abc argument');
  });

  it('selects sharded mode when --shards=N is passed', () => {
    expect(parseTestRunnerArgs(['--shards=4'])).toEqual({
      mode: 'sharded',
      shardTotal: 4,
      localArgs: [],
    });
  });

  it('throws on invalid --shards value', () => {
    expect(() => parseTestRunnerArgs(['--shards=0'])).toThrow('Invalid --shards=N value');
  });
});

describe('run-vitest-local argv parsing', () => {
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

  it('skips --reporter and its value', () => {
    const parsed = parseVitestLocalArgs(['--reporter', 'verbose', '--coverage']);
    expect(parsed.passthroughArgs).toEqual(['--coverage']);
    expect(parseReporterArgs(['--reporter', 'verbose', '--coverage'])).toEqual([
      '--reporter',
      'verbose',
    ]);
  });

  it('throws when --project is missing a value', () => {
    expect(() => parseVitestLocalArgs(['--project', '--coverage'])).toThrow(
      '--project requires unit or component',
    );
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
