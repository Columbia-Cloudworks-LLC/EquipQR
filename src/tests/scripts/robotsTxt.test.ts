import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const ROBOTS_PATH = join(process.cwd(), 'public', 'robots.txt');

/** Paths crawlers must not index (authenticated app + sensitive surfaces). */
const REQUIRED_DISALLOW_PREFIXES = [
  '/dashboard',
  '/equipment',
  '/inventory',
  '/work-orders',
  '/teams',
  '/settings',
  '/auth',
  '/api',
  '/tickets',
  '/dsr',
] as const;

describe('public/robots.txt', () => {
  const robotsTxt = readFileSync(ROBOTS_PATH, 'utf-8');

  it('references the production sitemap', () => {
    expect(robotsTxt).toContain('Sitemap: https://equipqr.app/sitemap.xml');
  });

  it('blocks authenticated and sensitive routes for the default user-agent', () => {
    const wildcardSection = robotsTxt.split('User-agent: *')[1] ?? '';
    for (const prefix of REQUIRED_DISALLOW_PREFIXES) {
      expect(wildcardSection).toContain(`Disallow: ${prefix}`);
    }
  });

  it('does not exempt search crawlers from authenticated route blocks', () => {
    for (const bot of ['Googlebot', 'Bingbot']) {
      expect(robotsTxt).not.toContain(`User-agent: ${bot}`);
    }
  });

  it('keeps social preview bots allowed at the site root', () => {
    for (const bot of ['Twitterbot', 'facebookexternalhit']) {
      const section = robotsTxt.split(`User-agent: ${bot}`)[1]?.split('User-agent:')[0] ?? '';
      expect(section).toContain('Allow: /');
    }
  });
});
