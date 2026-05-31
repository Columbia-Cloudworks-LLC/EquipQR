/**
 * Generate sitemap.xml for EquipQR marketing pages (source: `src/lib/marketingRoutes.ts`).
 * De-dupes by canonical path so compatibility aliases like /landing do not produce
 * a separate <url> entry when they share a canonicalPath with another route.
 *
 * <lastmod> uses SOURCE_DATE_EPOCH, then git HEAD committer date, then a pinned fallback.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { pathToFileURL } from 'node:url';
import {
  MARKETING_ROUTES,
  resolveCanonicalPath,
  type MarketingRoute,
} from '../src/lib/marketingRoutes';

const BASE_URL = 'https://equipqr.app';
const PINNED_FALLBACK_DATE = '2026-01-01';

function getReproducibleLastmod() {
  const envEpoch = process.env.SOURCE_DATE_EPOCH;
  if (envEpoch) {
    const ms = Number.parseInt(envEpoch, 10) * 1000;
    if (Number.isFinite(ms) && ms > 0) {
      return { value: new Date(ms).toISOString().slice(0, 10), source: 'SOURCE_DATE_EPOCH' };
    }
  }

  try {
    const iso = execSync('git log -1 --format=%cI', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (iso) {
      return { value: iso.slice(0, 10), source: 'git HEAD committer date' };
    }
  } catch {
    // git unavailable or not a repo
  }

  return { value: PINNED_FALLBACK_DATE, source: 'pinned fallback (no SOURCE_DATE_EPOCH, no git)' };
}

/**
 * Build sitemap XML from a marketing route array.
 * Entries are de-duped by canonical path; the first route that resolves to a given
 * canonical path is included and any subsequent aliases (e.g. /landing -> /) are skipped.
 * Exported for unit testing without filesystem side effects.
 */
export function buildSitemapXml(routes: readonly MarketingRoute[], lastmod: string): string {
  const seen = new Set<string>();
  const entries: string[] = [];

  for (const route of routes) {
    const canonical = resolveCanonicalPath(route);
    if (seen.has(canonical)) continue;
    seen.add(canonical);

    entries.push(`  <url>
    <loc>${BASE_URL}${canonical}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;
}

function generateSitemap() {
  const lastmod = getReproducibleLastmod();
  const sitemap = buildSitemapXml(MARKETING_ROUTES, lastmod.value);
  const outputPath = join(process.cwd(), 'public', 'sitemap.xml');
  writeFileSync(outputPath, sitemap, 'utf-8');
  const canonicalCount = new Set(MARKETING_ROUTES.map((r) => resolveCanonicalPath(r))).size;
  console.log(
    `✓ Generated sitemap.xml with ${canonicalCount} canonical URLs (lastmod=${lastmod.value}, source=${lastmod.source})`
  );
}

const invokedDirectly =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;

if (invokedDirectly) {
  generateSitemap();
}
