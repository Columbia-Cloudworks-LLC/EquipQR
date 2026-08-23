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

const SEARCH_ENGINE_BOTS = ['Googlebot', 'Bingbot'] as const;
const SOCIAL_PREVIEW_BOTS = ['Twitterbot', 'facebookexternalhit'] as const;

function sectionForBot(robotsTxt: string, bot: string): string {
  return robotsTxt.split(`User-agent: ${bot}`)[1]?.split('User-agent:')[0] ?? '';
}

describe('public/robots.txt', () => {
  const robotsTxt = readFileSync(ROBOTS_PATH, 'utf-8');

  it('references the production sitemap', () => {
    expect(robotsTxt).toContain('Sitemap: https://equipqr.app/sitemap.xml');
  });

  it('blocks authenticated and sensitive routes for search-engine and default crawlers', () => {
    const wildcardSection = robotsTxt.split('User-agent: *')[1] ?? '';
    for (const bot of [...SEARCH_ENGINE_BOTS, '*']) {
      const section = bot === '*' ? wildcardSection : sectionForBot(robotsTxt, bot);
      for (const prefix of REQUIRED_DISALLOW_PREFIXES) {
        expect(section).toContain(`Disallow: ${prefix}`);
      }
    }
  });

  it('keeps social preview bots allowed at the site root', () => {
    for (const bot of SOCIAL_PREVIEW_BOTS) {
      const section = sectionForBot(robotsTxt, bot);
      expect(section).toContain('Allow: /');
      for (const prefix of REQUIRED_DISALLOW_PREFIXES) {
        expect(section).not.toContain(`Disallow: ${prefix}`);
      }
    }
  });
});
