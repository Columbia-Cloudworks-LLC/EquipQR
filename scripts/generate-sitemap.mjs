#!/usr/bin/env node
/**
 * Generate sitemap.xml for EquipQR marketing pages
 *
 * This script generates a sitemap containing all public, indexable marketing routes.
 * Run during build to ensure sitemap is up-to-date.
 *
 * The <lastmod> date is derived from a layered, reproducible source so two builds
 * of the same commit produce byte-identical output:
 *   1. SOURCE_DATE_EPOCH env var (the reproducible-builds.org standard) — wins if set.
 *   2. The HEAD commit's committer date via `git log -1 --format=%cI` — used in
 *      typical local and Vercel builds where the .git directory is present.
 *   3. A pinned constant fallback — only reached when neither of the above is
 *      available (e.g., source extracted from a tarball without git history).
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const BASE_URL = 'https://equipqr.app';
const PINNED_FALLBACK_DATE = '2026-01-01';

// Public marketing routes that should be indexed
// Excludes: /auth, /dashboard/*, /invitation/*, /qr/*, /debug-*
const PUBLIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/landing', priority: '0.9', changefreq: 'monthly' },
  { path: '/solutions/repair-shops', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/pm-templates', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/inventory', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/part-lookup-alternates', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/qr-code-integration', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/google-workspace', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/quickbooks', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/work-order-management', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/team-collaboration', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/fleet-visualization', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/customer-crm', priority: '0.8', changefreq: 'monthly' },
  { path: '/features/mobile-first-design', priority: '0.8', changefreq: 'monthly' },
  { path: '/terms-of-service', priority: '0.3', changefreq: 'yearly' },
  { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
];

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
    // git unavailable or not a repo — fall through to pinned fallback
  }

  return { value: PINNED_FALLBACK_DATE, source: 'pinned fallback (no SOURCE_DATE_EPOCH, no git)' };
}

function generateSitemap() {
  const lastmod = getReproducibleLastmod();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_ROUTES.map(route => `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${lastmod.value}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  const outputPath = join(process.cwd(), 'public', 'sitemap.xml');
  writeFileSync(outputPath, sitemap, 'utf-8');
  console.log(`✓ Generated sitemap.xml with ${PUBLIC_ROUTES.length} URLs (lastmod=${lastmod.value}, source=${lastmod.source})`);
}

generateSitemap();
