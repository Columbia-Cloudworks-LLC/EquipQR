import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const LEGACY_FROM = [
  '/eqr-logo/*',
  '/branded-logos/*',
  '/placeholder.svg',
  '/us.svg',
  '/icons/:file.png',
  '/icons/:file.svg',
] as const;

const VERCEL_SOURCES = [
  '/eqr-logo/:path*',
  '/branded-logos/:path*',
  '/placeholder.svg',
  '/us.svg',
  '/icons/:file(.*).png',
  '/icons/:file(.*).svg',
] as const;

describe('legacy public image redirects', () => {
  it('keeps exact from-rules ahead of the SPA fallback', () => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      redirects?: Array<{ source: string }>;
    };
    const vercelSources = new Set((vercel.redirects ?? []).map((rule) => rule.source));
    for (const source of VERCEL_SOURCES) {
      expect(vercelSources.has(source), `${source} missing from vercel.json`).toBe(true);
    }

    const netlify = readFileSync('netlify.toml', 'utf8');
    const catchAllIndex = netlify.indexOf('from = "/*"');
    expect(catchAllIndex).toBeGreaterThan(-1);
    for (const from of LEGACY_FROM) {
      const needle = `from = "${from}"`;
      const ruleIndex = netlify.indexOf(needle);
      expect(ruleIndex, `${needle} missing from netlify.toml`).toBeGreaterThan(-1);
      expect(ruleIndex).toBeLessThan(catchAllIndex);
    }

    const published = readFileSync('public/_redirects', 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
    const sources = published.map((line) => line.split(/\s+/)[0] ?? '');
    const catchAllLine = sources.indexOf('/*');
    expect(catchAllLine).toBeGreaterThan(0);
    for (const from of LEGACY_FROM) {
      const ruleLine = sources.indexOf(from);
      expect(ruleLine, `${from} missing from public/_redirects`).toBeGreaterThan(-1);
      expect(ruleLine).toBeLessThan(catchAllLine);
    }
  });
});
