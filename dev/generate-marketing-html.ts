/**
 * After `vite build`, emit route-specific static HTML under `dist/` for marketing URLs
 * so crawlers and non-JS clients receive substantive body content inside `#root`.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { pathToFileURL } from 'node:url';
import {
  MARKETING_ROUTES,
  resolveCanonicalPath,
  resolveCanonicalUrl,
  resolveFullDocumentTitle,
  type MarketingRoute,
} from '../src/lib/marketingRoutes';

/** Empty Vite shell for SPA deep links; marketing prerender must not overwrite this file. */
export const APP_SHELL_HTML_BASENAME = 'app-shell.html';

export function resolveDistDir(cwd: string = process.cwd()): string {
  return join(cwd, 'dist');
}

export function getAppShellDistPath(distDir: string = resolveDistDir()): string {
  return join(distDir, APP_SHELL_HTML_BASENAME);
}

/** Persists the pre-prerender Vite template so Vercel can rewrite app routes to an empty `#root`. */
export function writeAppShellHtml(distDir: string, template: string): string {
  const outPath = getAppShellDistPath(distDir);
  writeFileSync(outPath, template, 'utf-8');
  return outPath;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceOne(html: string, pattern: RegExp, replacement: string, label: string): string {
  const m = html.match(pattern);
  if (!m) {
    throw new Error(`[generate-marketing-html] Missing required pattern for ${label}: ${pattern}`);
  }
  return html.replace(pattern, replacement);
}

function buildNavHtml(currentPath: string): string {
  const currentRoute =
    MARKETING_ROUTES.find((r) => r.path === currentPath) ??
    ({ path: currentPath, canonicalPath: currentPath } as MarketingRoute);
  const currentCanonical = resolveCanonicalPath(currentRoute);
  const isCurrentCanonical = currentPath === currentCanonical;

  const canonicalRepresentatives = new Map<string, MarketingRoute>();
  for (const route of MARKETING_ROUTES) {
    const canonical = resolveCanonicalPath(route);
    const existing = canonicalRepresentatives.get(canonical);
    const isCanonicalRoute = route.path === canonical;
    if (!existing || (isCanonicalRoute && existing.path !== canonical)) {
      canonicalRepresentatives.set(canonical, route);
    }
  }

  const links = [...canonicalRepresentatives.entries()]
    .filter(([canonical, route]) => {
      if (route.path === currentPath) return false;
      if (isCurrentCanonical && canonical === currentCanonical) return false;
      return true;
    })
    .map(([, route]) => {
      const label = escapeHtml(route.navLabel ?? route.heading);
      const href = escapeHtml(resolveCanonicalPath(route));
      return `          <li><a href="${href}">${label}</a></li>`;
    })
    .join('\n');

  return `<nav aria-label="Public marketing pages">
        <p><strong>Public marketing pages</strong></p>
        <ul>
${links}
        </ul>
      </nav>`;
}

function buildMainHtml(route: MarketingRoute): string {
  const paras = route.bodyParagraphs
    .map((p) => `        <p>${escapeHtml(p)}</p>`)
    .join('\n');
  const h1 = escapeHtml(route.heading);
  const routePathAttr = escapeHtml(route.path);

  return `
      <main id="main-content" data-prerendered-marketing-route="${routePathAttr}">
        <h1>${h1}</h1>
${paras}
${buildNavHtml(route.path)}
      </main>`;
}

/**
 * Build prerendered HTML for one marketing route from the Vite-produced `dist/index.html` template.
 * Exported for unit tests.
 */
export function prerenderMarketingHtmlTemplate(template: string, route: MarketingRoute): string {
  const fullTitle = resolveFullDocumentTitle(route);
  const canonicalUrl = resolveCanonicalUrl(route);
  const desc = route.description;

  let out = template;

  out = replaceOne(out, /<title>[^<]*<\/title>/, `<title>${escapeHtml(fullTitle)}</title>`, 'title');

  out = replaceOne(
    out,
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${escapeHtml(desc)}" />`,
    'meta description'
  );

  out = replaceOne(
    out,
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    'canonical'
  );

  out = replaceOne(
    out,
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${escapeHtml(fullTitle)}" />`,
    'og:title'
  );
  out = replaceOne(
    out,
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${escapeHtml(desc)}" />`,
    'og:description'
  );
  out = replaceOne(
    out,
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    'og:url'
  );

  const ogAlt = `${route.heading} - EquipQR`;
  out = replaceOne(
    out,
    /<meta property="og:image:alt" content="[^"]*" \/>/,
    `<meta property="og:image:alt" content="${escapeHtml(ogAlt)}" />`,
    'og:image:alt'
  );

  out = replaceOne(
    out,
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`,
    'twitter:title'
  );
  out = replaceOne(
    out,
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${escapeHtml(desc)}" />`,
    'twitter:description'
  );

  const rootRe = /<div id="root"[^>]*>\s*<\/div>/;
  const rootMatches = out.match(/<div id="root"/g);
  if (!rootMatches || rootMatches.length !== 1) {
    throw new Error(
      `[generate-marketing-html] Expected exactly one <div id="root"> in template, found ${rootMatches?.length ?? 0}`
    );
  }
  if (!rootRe.test(out)) {
    throw new Error('[generate-marketing-html] Root div must be empty (…></div>) for prerender injection');
  }

  const inner = `\n${buildMainHtml(route).trim()}\n    `;
  out = out.replace(rootRe, `<div id="root">${inner}</div>`);

  return out;
}

function distPathForRoute(pathname: string, distDir: string): string {
  if (pathname === '/') {
    return join(distDir, 'index.html');
  }
  const trimmed = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  return join(distDir, trimmed, 'index.html');
}

export function writeMarketingHtmlFiles(cwd: string = process.cwd()): void {
  const distDir = resolveDistDir(cwd);
  const sourceIndex = join(distDir, 'index.html');

  if (!existsSync(sourceIndex)) {
    throw new Error(`Missing Vite output at ${sourceIndex}. Run vite build first.`);
  }

  const template = readFileSync(sourceIndex, 'utf-8');
  writeAppShellHtml(distDir, template);

  for (const route of MARKETING_ROUTES) {
    const outPath = distPathForRoute(route.path, distDir);
    mkdirSync(dirname(outPath), { recursive: true });
    const html = prerenderMarketingHtmlTemplate(template, route);
    writeFileSync(outPath, html, 'utf-8');
  }

  console.log(
    `✓ Wrote ${MARKETING_ROUTES.length} marketing HTML files and ${APP_SHELL_HTML_BASENAME} under dist/`
  );
}

const invokedDirectly =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;

if (invokedDirectly) {
  writeMarketingHtmlFiles();
}
