#!/usr/bin/env node
/**
 * After `vitepress build`, move every inline <script> body in docs/.vitepress/dist
 * into a content-addressed external file under assets/ and rewrite the HTML to
 * reference it. This lets the equipqr.info CSP stay a static `script-src 'self'`.
 *
 * Why not sha256 hashes in docs/vercel.json? Vercel reads headers from the
 * *committed* vercel.json when the deployment is created, so hashes regenerated
 * during the build never take effect. Any docs edit changed VitePress's inline
 * __VP_HASH_MAP__ bootstrap, invalidated the committed hashes, and CSP then
 * blocked hydration site-wide (issues #1147/#1158: clicks did nothing).
 *
 * The extracted scripts are classic (non-module) blocking scripts, so execution
 * order and timing are preserved: the dark-mode check still runs before first
 * paint, and bootstrap globals are defined before the deferred app module runs.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const distDir = path.join(repoRoot, 'docs', '.vitepress', 'dist');
const assetsDir = path.join(distDir, 'assets');
const vercelConfigPath = path.join(repoRoot, 'docs', 'vercel.json');

const INLINE_SCRIPT_RE = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;

/** @param {string} scriptBody */
function scriptFileName(scriptBody) {
  const digest = crypto.createHash('sha256').update(scriptBody, 'utf8').digest('hex').slice(0, 16);
  return `inline.${digest}.js`;
}

/** @param {string} dir @returns {string[]} */
function collectHtmlFiles(dir) {
  /** @type {string[]} */
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectHtmlFiles(filePath));
    } else if (entry.name.endsWith('.html')) {
      files.push(filePath);
    }
  }
  return files;
}

function externalizeInlineScripts() {
  const htmlFiles = collectHtmlFiles(distDir);
  if (htmlFiles.length === 0) {
    throw new Error(`No HTML files found under ${distDir}.`);
  }

  /** @type {Map<string, string>} script body -> emitted file name */
  const emitted = new Map();
  let rewrittenFiles = 0;

  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, 'utf8');
    INLINE_SCRIPT_RE.lastIndex = 0;
    const next = html.replace(INLINE_SCRIPT_RE, (full, attrs, body) => {
      if (!body.trim()) {
        return full;
      }
      let fileName = emitted.get(body);
      if (!fileName) {
        fileName = scriptFileName(body);
        fs.mkdirSync(assetsDir, { recursive: true });
        fs.writeFileSync(path.join(assetsDir, fileName), body, 'utf8');
        emitted.set(body, fileName);
      }
      return `<script${attrs} src="/assets/${fileName}"></script>`;
    });
    if (next !== html) {
      fs.writeFileSync(filePath, next, 'utf8');
      rewrittenFiles += 1;
    }
  }

  return { emittedCount: emitted.size, rewrittenFiles, htmlCount: htmlFiles.length };
}

/** Fails the build when any inline script slipped through, so `script-src 'self'` stays valid. */
function assertNoInlineScriptsRemain() {
  for (const filePath of collectHtmlFiles(distDir)) {
    const html = fs.readFileSync(filePath, 'utf8');
    INLINE_SCRIPT_RE.lastIndex = 0;
    let match;
    while ((match = INLINE_SCRIPT_RE.exec(html)) !== null) {
      if (match[2].trim()) {
        throw new Error(
          `Inline script remains in ${path.relative(repoRoot, filePath)} after externalization; `
            + `the static script-src 'self' CSP would block it.`,
        );
      }
    }
  }
}

/** Guards against someone reintroducing hash- or unsafe-inline-based script-src in vercel.json. */
function assertStaticCsp() {
  const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  const catchAll = config.headers?.find((rule) => rule.source === '/(.*)');
  const csp = catchAll?.headers?.find((header) => header.key === 'Content-Security-Policy')?.value;
  if (!csp) {
    throw new Error(`Missing Content-Security-Policy header in ${vercelConfigPath}`);
  }
  const scriptSrc = csp
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith('script-src'));
  if (scriptSrc !== "script-src 'self'") {
    throw new Error(
      `Expected static "script-src 'self'" in ${vercelConfigPath} (found "${scriptSrc}"). `
        + `Vercel serves headers from the committed file, so dynamic hashes drift and break hydration.`,
    );
  }
}

function main() {
  try {
    fs.accessSync(path.join(distDir, 'index.html'));
  } catch {
    throw new Error(
      `Built docs not found at ${distDir}. Run "npm run docs:build" (vitepress build) first.`,
    );
  }

  const { emittedCount, rewrittenFiles, htmlCount } = externalizeInlineScripts();
  assertNoInlineScriptsRemain();
  assertStaticCsp();

  console.log(
    `externalize-docs-inline-scripts: extracted ${emittedCount} script(s), `
      + `rewrote ${rewrittenFiles}/${htmlCount} HTML file(s); CSP stays script-src 'self'.`,
  );
}

main();
