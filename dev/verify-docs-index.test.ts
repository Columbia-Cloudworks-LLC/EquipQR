import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import {
  GITHUB_REPO_URL,
  GITHUB_SHORTCUT_HOST,
  collectBrokenAgentsLinks,
  collectLocalMarkdownHrefs,
  findGithubShortcutRedirect,
  isGithubShortcutLiveRedirect,
  locationMatchesRepo,
  resolveLocalMarkdownHref,
} from './verify-docs-index.mjs';

const thisFile = fileURLToPath(import.meta.url);

describe('collectLocalMarkdownHrefs', () => {
  it('keeps repo-relative links and drops absolute URLs', () => {
    const markdown = [
      '[secrets](docs/ops/agent-secrets-and-access.md)',
      '[branching](.cursor/rules/branching.mdc#work-mode)',
      '[app](https://equipqr.app)',
      '[mail](mailto:invite@equipqr.app)',
      '[same](#refs)',
    ].join('\n');

    expect(collectLocalMarkdownHrefs(markdown)).toEqual([
      'docs/ops/agent-secrets-and-access.md',
      '.cursor/rules/branching.mdc#work-mode',
    ]);
  });
});

describe('resolveLocalMarkdownHref', () => {
  it('strips anchors and resolves against the index file', () => {
    const resolved = resolveLocalMarkdownHref(
      'docs/README.md#agent-handbook',
      '/repo/AGENTS.md',
    );
    expect(resolved.replaceAll('\\', '/')).toBe('/repo/docs/README.md');
  });
});

describe('collectBrokenAgentsLinks', () => {
  it('reports missing files and ignores files that exist', () => {
    const markdown = '[ok](verify-docs-index.test.ts)\n[missing](no-such-doc.md)';
    const broken = collectBrokenAgentsLinks(markdown, thisFile);
    expect(broken).toEqual(['no-such-doc.md']);
  });
});

describe('findGithubShortcutRedirect', () => {
  it('requires host match, permanent flag, and the repo URL', () => {
    const match = {
      source: '/(.*)',
      destination: GITHUB_REPO_URL,
      permanent: true,
      has: [{ type: 'host', value: GITHUB_SHORTCUT_HOST }],
    };

    expect(findGithubShortcutRedirect({ redirects: [match] })).toEqual(match);
    expect(
      findGithubShortcutRedirect({
        redirects: [{ ...match, permanent: false }],
      }),
    ).toBeUndefined();
    expect(
      findGithubShortcutRedirect({
        redirects: [{ ...match, destination: 'https://github.com/' }],
      }),
    ).toBeUndefined();
    expect(
      findGithubShortcutRedirect({
        redirects: [{ ...match, has: [{ type: 'host', value: 'equipqr.app' }] }],
      }),
    ).toBeUndefined();
  });
});

describe('isGithubShortcutLiveRedirect', () => {
  it('accepts permanent and temporary HTTPS redirects to the repo', () => {
    expect(
      isGithubShortcutLiveRedirect({ status: 308, location: GITHUB_REPO_URL }),
    ).toBe(true);
    expect(
      isGithubShortcutLiveRedirect({
        status: 301,
        location: `${GITHUB_REPO_URL}/`,
      }),
    ).toBe(true);
    expect(
      isGithubShortcutLiveRedirect({ status: 200, location: GITHUB_REPO_URL }),
    ).toBe(false);
    expect(
      isGithubShortcutLiveRedirect({
        status: 308,
        location: 'https://equipqr.app/',
      }),
    ).toBe(false);
  });
});

describe('locationMatchesRepo', () => {
  it('ignores a trailing slash', () => {
    expect(locationMatchesRepo(`${GITHUB_REPO_URL}/`, GITHUB_REPO_URL)).toBe(true);
  });
});
