import { describe, it, expect } from 'vitest';
import type { MarketingRoute } from '@/lib/marketingRoutes';
import { MARKETING_ROUTES } from '@/lib/marketingRoutes';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  prerenderMarketingHtmlTemplate,
  writeAppShellHtml,
  writeMarketingHtmlFiles,
} from './generate-marketing-html';

function requireMarketingRoute(path: string): MarketingRoute {
  const route = MARKETING_ROUTES.find((r) => r.path === path);
  if (!route) {
    throw new Error(`Expected marketing route ${path} to exist`);
  }
  return route;
}

/** Matches scripts/generate-marketing-html.ts empty-root contract (attributes allowed). */
const EMPTY_ROOT_DIV_RE = /<div id="root"[^>]*>\s*<\/div>/;

const MINIMAL_DIST_TEMPLATE = `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <title>EquipQR | Placeholder</title>
    <meta name="description" content="Placeholder description." />
    <link rel="canonical" href="https://equipqr.app" />
    <meta property="og:title" content="OG Old" />
    <meta property="og:description" content="OG Desc Old" />
    <meta property="og:url" content="https://equipqr.app" />
    <meta property="og:image:alt" content="Old alt" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@equipqr" />
    <meta name="twitter:title" content="Tw Old" />
    <meta name="twitter:description" content="Tw Desc Old" />
    <meta name="twitter:image" content="https://equipqr.app/og-image.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" crossorigin src="/assets/index-TESTHASH.js"></script>
  </body>
</html>`;

describe('prerenderMarketingHtmlTemplate', () => {
  it('injects work order route copy, nav, metadata, and preserves Vite script', () => {
    const route = requireMarketingRoute('/features/work-order-management');

    const html = prerenderMarketingHtmlTemplate(MINIMAL_DIST_TEMPLATE, route);

    expect(html).toContain('<title>Work Order Management | EquipQR</title>');
    expect(html).toContain(
      '<link rel="canonical" href="https://equipqr.app/features/work-order-management" />'
    );
    expect(html).toContain('Create, assign, and track work orders with intelligent workflows');
    expect(html).toContain('data-prerendered-marketing-route="/features/work-order-management"');
    expect(html).toContain('aria-label="Public marketing pages"');
    expect(html).toContain('Public marketing pages');
    expect(html).toContain('<script type="module" crossorigin src="/assets/index-TESTHASH.js"></script>');
    expect(html).not.toContain('<meta name="keywords"');
    // Nav must use canonical hrefs and must not include the /landing alias as a separate link
    expect(html).toContain('href="/"');
    expect(html).not.toContain('href="/landing"');
  });

  it('uses canonical home metadata for the /landing compatibility route', () => {
    const route = requireMarketingRoute('/landing');

    const html = prerenderMarketingHtmlTemplate(MINIMAL_DIST_TEMPLATE, route);

    expect(html).toContain(
      '<title>EquipQR | Free Work Order Software for Heavy Equipment Repair Shops</title>'
    );
    expect(html).toContain('<link rel="canonical" href="https://equipqr.app/" />');
    expect(html).toContain(
      '<meta property="og:title" content="EquipQR | Free Work Order Software for Heavy Equipment Repair Shops" />'
    );
    expect(html).toContain(
      '<meta name="twitter:title" content="EquipQR | Free Work Order Software for Heavy Equipment Repair Shops" />'
    );
    expect(html).not.toContain('| EquipQR | EquipQR');
    // Nav must include canonical Home and must not include the /landing alias as a separate link
    expect(html).toContain('href="/"');
    expect(html).not.toContain('href="/landing"');
  });

  it('excludes self-link and /landing alias when prerendering canonical home', () => {
    const route = requireMarketingRoute('/');

    const html = prerenderMarketingHtmlTemplate(MINIMAL_DIST_TEMPLATE, route);

    expect(html).not.toContain('href="/landing"');
    expect(html).not.toMatch(/<a href="\/">Home<\/a>/);
  });

  it('injects marketing body for canonical home while the Vite template keeps an empty root', () => {
    const route = requireMarketingRoute('/');
    const homeHtml = prerenderMarketingHtmlTemplate(MINIMAL_DIST_TEMPLATE, route);

    expect(homeHtml).toContain('data-prerendered-marketing-route="/"');
    expect(MINIMAL_DIST_TEMPLATE).toMatch(EMPTY_ROOT_DIV_RE);
    expect(homeHtml).not.toMatch(EMPTY_ROOT_DIV_RE);
  });
});

describe('writeAppShellHtml', () => {
  it('writes the untouched Vite template with an empty root for SPA fallback', () => {
    const distDir = mkdtempSync(join(tmpdir(), 'equipqr-marketing-'));
    try {
      const outPath = writeAppShellHtml(distDir, MINIMAL_DIST_TEMPLATE);
      const shell = readFileSync(outPath, 'utf-8');

      expect(shell).toBe(MINIMAL_DIST_TEMPLATE);
      expect(shell).toMatch(EMPTY_ROOT_DIV_RE);
      expect(shell).not.toContain('data-prerendered-marketing-route');
    } finally {
      rmSync(distDir, { recursive: true, force: true });
    }
  });
});

describe('writeMarketingHtmlFiles', () => {
  it('preserves app-shell.html before prerendering marketing routes', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'equipqr-marketing-dist-'));
    const distDir = join(projectRoot, 'dist');
    try {
      mkdirSync(distDir, { recursive: true });
      writeFileSync(join(distDir, 'index.html'), MINIMAL_DIST_TEMPLATE, 'utf-8');

      writeMarketingHtmlFiles(projectRoot);

      const appShell = readFileSync(join(distDir, 'app-shell.html'), 'utf-8');
      const marketingHome = readFileSync(join(distDir, 'index.html'), 'utf-8');

      expect(appShell).toBe(MINIMAL_DIST_TEMPLATE);
      expect(appShell).not.toContain('data-prerendered-marketing-route');
      expect(marketingHome).toContain('data-prerendered-marketing-route="/"');
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('keeps app-shell empty, marketing paths prerendered, and no static dashboard file', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'equipqr-spa-routing-'));
    const distDir = join(projectRoot, 'dist');
    try {
      mkdirSync(distDir, { recursive: true });
      writeFileSync(join(distDir, 'index.html'), MINIMAL_DIST_TEMPLATE, 'utf-8');

      writeMarketingHtmlFiles(projectRoot);

      const appShell = readFileSync(join(distDir, 'app-shell.html'), 'utf-8');
      const inventoryHtml = readFileSync(join(distDir, 'features', 'inventory', 'index.html'), 'utf-8');
      const dashboardStatic = join(distDir, 'dashboard', 'index.html');

      expect(appShell).toMatch(EMPTY_ROOT_DIV_RE);
      expect(appShell).not.toContain('data-prerendered-marketing-route');
      expect(inventoryHtml).toContain('data-prerendered-marketing-route="/features/inventory"');
      expect(inventoryHtml).not.toMatch(EMPTY_ROOT_DIV_RE);
      expect(existsSync(dashboardStatic)).toBe(false);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('preserves app-shell when Vite emits a root div with attributes', () => {
    const templateWithRootAttrs = MINIMAL_DIST_TEMPLATE.replace(
      '<div id="root"></div>',
      '<div id="root" data-vite-root></div>'
    );
    const projectRoot = mkdtempSync(join(tmpdir(), 'equipqr-root-attrs-'));
    const distDir = join(projectRoot, 'dist');
    try {
      mkdirSync(distDir, { recursive: true });
      writeFileSync(join(distDir, 'index.html'), templateWithRootAttrs, 'utf-8');

      writeMarketingHtmlFiles(projectRoot);

      const appShell = readFileSync(join(distDir, 'app-shell.html'), 'utf-8');
      expect(appShell).toBe(templateWithRootAttrs);
      expect(appShell).toMatch(EMPTY_ROOT_DIV_RE);
      expect(appShell).not.toContain('data-prerendered-marketing-route');
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
