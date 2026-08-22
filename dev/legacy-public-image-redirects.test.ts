import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const LEGACY_PATHS = [
  '/eqr-logo/',
  '/branded-logos/',
  '/placeholder.svg',
  '/us.svg',
  '/icons/',
] as const;

describe('legacy public image redirects', () => {
  it('keeps Vercel, Netlify, and _redirects rules ahead of the SPA fallback', () => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      redirects?: Array<{ source: string }>;
    };
    const vercelSources = (vercel.redirects ?? []).map((rule) => rule.source);
    expect(vercelSources.some((source) => source.startsWith('/eqr-logo/'))).toBe(true);
    expect(vercelSources.some((source) => source.startsWith('/branded-logos/'))).toBe(true);
    expect(vercelSources).toContain('/placeholder.svg');
    expect(vercelSources).toContain('/us.svg');
    expect(vercelSources.some((source) => source.startsWith('/icons/'))).toBe(true);

    const netlify = readFileSync('netlify.toml', 'utf8');
    const catchAllIndex = netlify.indexOf('from = "/*"');
    expect(catchAllIndex).toBeGreaterThan(-1);
    for (const path of LEGACY_PATHS) {
      const ruleIndex = netlify.indexOf(path);
      expect(ruleIndex, `${path} missing from netlify.toml`).toBeGreaterThan(-1);
      expect(ruleIndex).toBeLessThan(catchAllIndex);
    }

    const published = readFileSync('public/_redirects', 'utf8').split(/\r?\n/);
    const catchAllLine = published.findIndex((line) => line.startsWith('/* '));
    expect(catchAllLine).toBeGreaterThan(0);
    for (const path of LEGACY_PATHS) {
      const ruleLine = published.findIndex((line) => line.includes(path));
      expect(ruleLine, `${path} missing from public/_redirects`).toBeGreaterThan(-1);
      expect(ruleLine).toBeLessThan(catchAllLine);
    }
  });
});
