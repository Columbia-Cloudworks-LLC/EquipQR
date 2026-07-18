import { describe, it, expect } from 'vitest';
import { MARKETING_ROUTES } from '@/lib/marketingRoutes';
import { buildSitemapXml } from './generate-sitemap';

describe('buildSitemapXml', () => {
  const sitemap = buildSitemapXml(MARKETING_ROUTES, '2026-01-01');

  it('contains the canonical home URL exactly once', () => {
    const matches = sitemap.match(/<loc>https:\/\/equipqr\.app\/<\/loc>/g);
    expect(matches?.length).toBe(1);
  });

  it('does not include the /landing compatibility alias as a separate URL', () => {
    expect(sitemap).not.toContain('/landing');
  });

  it('includes representative canonical feature URLs', () => {
    expect(sitemap).toContain('<loc>https://equipqr.app/features/work-order-management</loc>');
    expect(sitemap).toContain('<loc>https://equipqr.app/features/quickbooks</loc>');
    expect(sitemap).toContain('<loc>https://equipqr.app/features/qr-code-integration</loc>');
  });

  it('has correct XML structure', () => {
    expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain('<changefreq>');
    expect(sitemap).toContain('<priority>');
    expect(sitemap).toContain('<lastmod>2026-01-01</lastmod>');
  });

  it('de-dupes routes with the same canonical path (first occurrence wins)', () => {
    // Feed a minimal route list that has a duplicate canonical path
    const testRoutes = [
      {
        path: '/',
        priority: '1.0',
        changefreq: 'weekly',
        title: 'Home',
        description: 'Home desc',
        heading: 'Home',
        bodyParagraphs: ['A', 'B'] as [string, string],
      },
      {
        path: '/landing',
        canonicalPath: '/',
        priority: '0.9',
        changefreq: 'monthly',
        title: 'Landing',
        description: 'Landing desc',
        heading: 'Landing',
        bodyParagraphs: ['A', 'B'] as [string, string],
      },
    ] as const;

    const xml = buildSitemapXml(testRoutes, '2026-01-01');
    const homeMatches = xml.match(/<loc>https:\/\/equipqr\.app\/<\/loc>/g);
    expect(homeMatches?.length).toBe(1);
    expect(xml).not.toContain('/landing');
  });
});
