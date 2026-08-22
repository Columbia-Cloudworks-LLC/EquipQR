import { describe, it, expect } from 'vitest';
import { matchesFile, parseCatalog, renderArgv } from './lint-catalog.mjs';

const repoRoot = 'C:\\repo';

describe('matchesFile', () => {
  it('returns false for match.kind never', () => {
    expect(matchesFile({ kind: 'never' }, `${repoRoot}\\src\\app.ts`, repoRoot)).toBe(false);
  });

  it('matches .ts and skips .d.ts', () => {
    const match = {
      kind: 'when' as const,
      extensions: ['.ts', '.tsx'],
      excludeSuffixes: ['.d.ts'],
    };
    expect(matchesFile(match, `${repoRoot}\\src\\app.ts`, repoRoot)).toBe(true);
    expect(matchesFile(match, `${repoRoot}\\src\\app.tsx`, repoRoot)).toBe(true);
    expect(matchesFile(match, `${repoRoot}\\src\\app.d.ts`, repoRoot)).toBe(false);
    expect(matchesFile(match, `${repoRoot}\\README.md`, repoRoot)).toBe(false);
  });

  it('requires the under prefix for workflow files', () => {
    const match = {
      kind: 'when' as const,
      extensions: ['.yml', '.yaml'],
      under: '.github/workflows',
    };
    expect(matchesFile(match, `${repoRoot}\\.github\\workflows\\ci.yml`, repoRoot)).toBe(true);
    expect(matchesFile(match, `${repoRoot}\\.github\\dependabot.yml`, repoRoot)).toBe(false);
  });
});

describe('parseCatalog', () => {
  it('rejects match.never with a non-null hook', () => {
    expect(() =>
      parseCatalog({
        version: 1,
        targets: [
          {
            id: 'fallow',
            kind: 'npx',
            package: 'fallow@2.88.0',
            match: { kind: 'never' },
            hook: {
              failClosed: true,
              missingTool: 'block',
              argv: ['--format', 'json'],
              maxOutputLines: 20,
            },
            batch: {
              steps: [{ argv: ['--summary'], contract: { kind: 'exit-code' } }],
            },
          },
        ],
      })
    ).toThrow(/never cannot have a non-null hook/);
  });

  it('accepts match.never with a null hook', () => {
    const catalog = parseCatalog({
      version: 1,
      targets: [
        {
          id: 'fallow',
          kind: 'npx',
          package: 'fallow@2.88.0',
          match: { kind: 'never' },
          hook: null,
          batch: {
            steps: [{ argv: ['--summary'], contract: { kind: 'fallow-unused', maxIssues: 0 } }],
          },
        },
      ],
    });
    expect(catalog.targets).toHaveLength(1);
    expect(catalog.targets[0]?.hook).toBeNull();
  });
});

describe('renderArgv', () => {
  it('substitutes {{file}} and {{repoRoot}} only', () => {
    expect(
      renderArgv(['--path', '{{file}}', '{{repoRoot}}', '{{other}}'], {
        file: 'src\\app.ts',
        repoRoot: 'C:\\repo',
      })
    ).toEqual(['--path', 'src\\app.ts', 'C:\\repo', '{{other}}']);
  });
});
