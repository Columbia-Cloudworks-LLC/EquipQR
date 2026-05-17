#!/usr/bin/env npx tsx
/**
 * Generate sitemap.xml for EquipQR marketing pages (source: `src/lib/marketingRoutes.ts`).
 *
 * <lastmod> uses SOURCE_DATE_EPOCH, then git HEAD committer date, then a pinned fallback.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { MARKETING_ROUTES } from '../src/lib/marketingRoutes';

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

function generateSitemap() {
  const lastmod = getReproducibleLastmod();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${MARKETING_ROUTES.map(
  (route) => `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${lastmod.value}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
).join('\n')}
</urlset>`;

  const outputPath = join(process.cwd(), 'public', 'sitemap.xml');
  writeFileSync(outputPath, sitemap, 'utf-8');
  console.log(
    `✓ Generated sitemap.xml with ${MARKETING_ROUTES.length} URLs (lastmod=${lastmod.value}, source=${lastmod.source})`
  );
}

generateSitemap();
