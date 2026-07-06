#!/usr/bin/env node
/**
 * After `vitepress build`, scan docs/.vitepress/dist for inline <script> bodies and
 * rewrite the equipqr.info CSP in docs/vercel.json with sha256 hashes instead of
 * script-src 'unsafe-inline'. VitePress requires those inline bootstraps; hashes
 * are stable for a given build output and keep XSS protections meaningful.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const distDir = path.join(repoRoot, 'docs', '.vitepress', 'dist');
const vercelConfigPath = path.join(repoRoot, 'docs', 'vercel.json');

const INLINE_SCRIPT_RE = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;

/** @param {string} scriptBody */
function cspSha256Hash(scriptBody) {
  const digest = crypto.createHash('sha256').update(scriptBody, 'utf8').digest('base64');
  return `'sha256-${digest}'`;
}

/** @param {string} dir */
function collectInlineScripts(dir) {
  /** @type {Set<string>} */
  const scripts = new Set();

  /** @param {string} currentDir */
  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const filePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(filePath);
        continue;
      }
      if (!entry.name.endsWith('.html')) {
        continue;
      }

      const html = fs.readFileSync(filePath, 'utf8');
      let match;
      while ((match = INLINE_SCRIPT_RE.exec(html)) !== null) {
        const body = match[2];
        if (body.trim()) {
          scripts.add(body);
        }
      }
    }
  }

  walk(dir);
  return scripts;
}

function buildScriptSrc(scripts) {
  const hashes = [...scripts].map(cspSha256Hash).sort();
  return `script-src 'self' ${hashes.join(' ')}`;
}

function buildContentSecurityPolicy(scriptSrc) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

function updateVercelConfig(cspValue) {
  const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  const catchAll = config.headers?.find((rule) => rule.source === '/(.*)');
  if (!catchAll) {
    throw new Error(`Missing catch-all headers rule in ${vercelConfigPath}`);
  }

  const cspHeader = catchAll.headers?.find((header) => header.key === 'Content-Security-Policy');
  if (!cspHeader) {
    throw new Error(`Missing Content-Security-Policy header in ${vercelConfigPath}`);
  }

  cspHeader.value = cspValue;
  fs.writeFileSync(vercelConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function main() {
  try {
    fs.accessSync(path.join(distDir, 'index.html'));
  } catch {
    throw new Error(
      `Built docs not found at ${distDir}. Run "npm run docs:build" (vitepress build) first.`,
    );
  }

  const scripts = collectInlineScripts(distDir);
  if (scripts.size === 0) {
    throw new Error(`No inline scripts found under ${distDir}; refusing to emit an empty script-src.`);
  }

  const scriptSrc = buildScriptSrc(scripts);
  const csp = buildContentSecurityPolicy(scriptSrc);
  updateVercelConfig(csp);

  console.log(
    `generate-docs-csp: updated ${path.relative(repoRoot, vercelConfigPath)} `
      + `with ${scripts.size} inline script hash(es), CSP length ${csp.length}.`,
  );
}

main();
