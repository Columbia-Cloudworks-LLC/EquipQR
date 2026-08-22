import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  curlDownloadArgs,
  matchesFile,
  npxCliCandidates,
  parseCatalog,
  pwshArgvFlags,
  pwshModuleInstallScript,
  renderArgv,
  resolveNpxCli,
  unknownOnlyIds,
} from './lint-catalog.mjs';

const repoRoot = path.resolve('/equipqr-lint-catalog');

describe('matchesFile', () => {
  it('returns false for match.kind never', () => {
    expect(matchesFile({ kind: 'never' }, path.join(repoRoot, 'src', 'app.ts'), repoRoot)).toBe(false);
  });

  it('matches .ts and skips .d.ts', () => {
    const match = {
      kind: 'when' as const,
      extensions: ['.ts', '.tsx'],
      excludeSuffixes: ['.d.ts'],
    };
    expect(matchesFile(match, path.join(repoRoot, 'src', 'app.ts'), repoRoot)).toBe(true);
    expect(matchesFile(match, path.join(repoRoot, 'src', 'app.tsx'), repoRoot)).toBe(true);
    expect(matchesFile(match, path.join(repoRoot, 'src', 'app.d.ts'), repoRoot)).toBe(false);
    expect(matchesFile(match, path.join(repoRoot, 'README.md'), repoRoot)).toBe(false);
  });

  it('requires the under prefix for workflow files', () => {
    const match = {
      kind: 'when' as const,
      extensions: ['.yml', '.yaml'],
      under: '.github/workflows',
    };
    expect(matchesFile(match, path.join(repoRoot, '.github', 'workflows', 'ci.yml'), repoRoot)).toBe(true);
    expect(matchesFile(match, path.join(repoRoot, '.github', 'dependabot.yml'), repoRoot)).toBe(false);
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

describe('npx readiness', () => {
  it('lists Node and repo npm layouts', () => {
    const candidates = npxCliCandidates(path.join(repoRoot, 'app'));
    expect(candidates.some((candidate) => candidate.endsWith(path.join('npm', 'bin', 'npx-cli.js')))).toBe(true);
    expect(candidates.some((candidate) => candidate.includes(path.join('app', 'node_modules', 'npm')))).toBe(true);
  });

  it('resolves npx-cli.js from the running Node install', () => {
    expect(resolveNpxCli(repoRoot).endsWith('npx-cli.js')).toBe(true);
  });
});

describe('pwshArgvFlags', () => {
  it('drops -Path and keeps remaining flags such as -EnableExit', () => {
    expect(pwshArgvFlags(['-Path', path.join(repoRoot, 'script.ps1'), '-EnableExit'])).toEqual(['-EnableExit']);
  });
});

describe('curlDownloadArgs', () => {
  it('bounds downloads with a timeout and retries', () => {
    const args = curlDownloadArgs('https://example.invalid/file', path.join(repoRoot, 'file.bin'));
    expect(args).toContain('--max-time');
    expect(args).toContain('--retry');
  });
});

describe('unknownOnlyIds', () => {
  it('returns catalog IDs that were requested but not defined', () => {
    const catalog = parseCatalog({
      version: 1,
      targets: [
        {
          id: 'eslint',
          kind: 'node-cli',
          bin: 'eslint/bin/eslint.js',
          match: { kind: 'when', extensions: ['.ts'] },
          hook: {
            failClosed: true,
            missingTool: 'block',
            argv: ['{{file}}'],
            maxOutputLines: 20,
          },
          batch: { steps: [{ argv: ['.'], contract: { kind: 'exit-code' } }] },
        },
      ],
    });
    expect(unknownOnlyIds(catalog, ['eslint'])).toEqual([]);
    expect(unknownOnlyIds(catalog, ['eslint', 'nope'])).toEqual(['nope']);
  });
});

describe('pwshModuleInstallScript', () => {
  it('restores the previous PSGallery installation policy', () => {
    const script = pwshModuleInstallScript('PSScriptAnalyzer', '1.23.0');
    expect(script).toContain('$previousPolicy');
    expect(script).toContain('finally');
    expect(script).toContain('Set-PSRepository -Name PSGallery -InstallationPolicy $previousPolicy');
    expect(script).not.toMatch(/SkipPublisherCheck/);
  });
});

describe('renderArgv', () => {
  it('substitutes {{file}} and {{repoRoot}} only', () => {
    expect(
      renderArgv(['--path', '{{file}}', '{{repoRoot}}', '{{other}}'], {
        file: path.join('src', 'app.ts'),
        repoRoot,
      })
    ).toEqual(['--path', path.join('src', 'app.ts'), repoRoot, '{{other}}']);
  });
});
