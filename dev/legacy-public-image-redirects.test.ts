import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type RedirectRule = {
  from: string;
  to: string;
  status: number;
};

const EXPECTED_RULES: readonly RedirectRule[] = [
  { from: '/eqr-logo/:path*', to: '/images/brand/eqr-logo/:path*', status: 301 },
  { from: '/branded-logos/:path*', to: '/images/brand/logos/:path*', status: 301 },
  { from: '/placeholder.svg', to: '/images/ui/placeholder.svg', status: 301 },
  { from: '/us.svg', to: '/images/maps/us.svg', status: 301 },
  { from: '/icons/:file(.*).png', to: '/images/brand/icons/:file.png', status: 301 },
  { from: '/icons/:file(.*).svg', to: '/images/equipment/:file.svg', status: 301 },
];

const NETLIFY_FROM_ALIASES: Record<string, string> = {
  '/eqr-logo/:path*': '/eqr-logo/*',
  '/branded-logos/:path*': '/branded-logos/*',
  '/icons/:file(.*).png': '/icons/:file.png',
  '/icons/:file(.*).svg': '/icons/:file.svg',
};

const NETLIFY_TO_ALIASES: Record<string, string> = {
  '/images/brand/eqr-logo/:path*': '/images/brand/eqr-logo/:splat',
  '/images/brand/logos/:path*': '/images/brand/logos/:splat',
};

function parseNetlifyRedirects(toml: string): RedirectRule[] {
  return toml
    .split('[[redirects]]')
    .slice(1)
    .map((block) => {
      const from = /from\s*=\s*"([^"]+)"/.exec(block)?.[1] ?? '';
      const to = /to\s*=\s*"([^"]+)"/.exec(block)?.[1] ?? '';
      const status = Number(/status\s*=\s*(\d+)/.exec(block)?.[1] ?? '0');
      return { from, to, status };
    })
    .filter((rule) => rule.from.length > 0);
}

function parsePublishedRedirects(text: string): RedirectRule[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      const [from = '', to = '', statusToken = '0'] = line.split(/\s+/);
      return { from, to, status: Number(statusToken) };
    });
}

function expectRuleAheadOfCatchAll(rules: RedirectRule[], expected: RedirectRule): void {
  const catchAllIndex = rules.findIndex((rule) => rule.from === '/*');
  expect(catchAllIndex, 'SPA catch-all must exist').toBeGreaterThan(-1);
  const ruleIndex = rules.findIndex((rule) => rule.from === expected.from);
  expect(ruleIndex, `${expected.from} missing`).toBeGreaterThan(-1);
  expect(ruleIndex, `${expected.from} must precede /*`).toBeLessThan(catchAllIndex);
  expect(rules[ruleIndex]).toEqual(expected);
}

describe('legacy public image redirects', () => {
  it('pins source, destination, and 301 status ahead of the SPA fallback', () => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      redirects?: Array<{ source?: string; destination?: string; permanent?: boolean }>;
    };
    const vercelBySource = new Map(
      (vercel.redirects ?? []).map((rule) => [rule.source ?? '', rule]),
    );
    for (const expected of EXPECTED_RULES) {
      const actual = vercelBySource.get(expected.from);
      expect(actual, `${expected.from} missing from vercel.json`).toBeDefined();
      expect(actual?.destination).toBe(expected.to);
      expect(actual?.permanent, `${expected.from} must be permanent`).toBe(true);
    }

    const netlifyRules = parseNetlifyRedirects(readFileSync('netlify.toml', 'utf8'));
    const publishedRules = parsePublishedRedirects(readFileSync('public/_redirects', 'utf8'));

    for (const expected of EXPECTED_RULES) {
      const netlifyExpected: RedirectRule = {
        from: NETLIFY_FROM_ALIASES[expected.from] ?? expected.from,
        to: NETLIFY_TO_ALIASES[expected.to] ?? expected.to,
        status: expected.status,
      };
      expectRuleAheadOfCatchAll(netlifyRules, netlifyExpected);
      expectRuleAheadOfCatchAll(publishedRules, netlifyExpected);
    }
  });
});
