#!/usr/bin/env node
/**
 * Generate sitemap.xml for EquipQR marketing pages
 * 
 * This script generates a sitemap containing all public, indexable marketing routes.
 * Run during build to ensure sitemap is up-to-date.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://equipqr.app';

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

function generateSitemap() {
  const now = new Date().toISOString();
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_ROUTES.map(route => `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${now.split('T')[0]}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  const outputPath = join(process.cwd(), 'public', 'sitemap.xml');
  writeFileSync(outputPath, sitemap, 'utf-8');
  console.log(`✓ Generated sitemap.xml with ${PUBLIC_ROUTES.length} URLs`);
}

generateSitemap();
