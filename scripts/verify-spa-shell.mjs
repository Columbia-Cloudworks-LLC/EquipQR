#!/usr/bin/env node

/**
 * Verify SPA deep-link routing artifacts after `npm run build`.
 *
 * Ensures dist/app-shell.html exists and platform configs target the correct
 * SPA fallback: Vercel uses cleanUrls /app-shell; Netlify/_redirects use
 * /app-shell.html (literal build artifact).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error(message);
  process.exit(1);
}

const distAppShell = path.join(repoRoot, 'dist', 'app-shell.html');
if (!fs.existsSync(distAppShell)) {
  fail('Missing dist/app-shell.html. Run npm run build first.');
}

const vercelPath = path.join(repoRoot, 'vercel.json');
if (!fs.existsSync(vercelPath)) {
  fail('Missing vercel.json at repo root.');
}

/** @type {{ rewrites?: Array<{ source?: string; destination?: string }>; cleanUrls?: boolean }} */
let vercel;
try {
  vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
} catch {
  fail('vercel.json is not valid JSON.');
}

const CANONICAL_REWRITE_SOURCE = '/((?!.*\\.).*)';
const CANONICAL_REWRITE_DEST = '/app-shell';

const rewrite = (vercel.rewrites ?? []).find(
  (entry) => entry.destination === CANONICAL_REWRITE_DEST
);
if (!rewrite) {
  fail('vercel.json has no SPA fallback rewrite to /app-shell.');
}
if (rewrite.source !== CANONICAL_REWRITE_SOURCE) {
  fail(
    `vercel.json rewrite source must be ${CANONICAL_REWRITE_SOURCE} (found: ${rewrite.source ?? 'missing'}).`
  );
}
if (vercel.cleanUrls !== true) {
  fail('vercel.json must set cleanUrls: true so /app-shell resolves to app-shell.html.');
}

const redirectsPath = path.join(repoRoot, 'public', '_redirects');
if (!fs.existsSync(redirectsPath)) {
  fail('Missing public/_redirects.');
}

const redirectLine =
  fs
    .readFileSync(redirectsPath, 'utf8')
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0)
    ?.trim() ?? '';
if (redirectLine !== '/* /app-shell.html 200') {
  fail(`public/_redirects must be '/* /app-shell.html 200' (found: ${redirectLine}).`);
}

const distRedirectsPath = path.join(repoRoot, 'dist', '_redirects');
if (!fs.existsSync(distRedirectsPath)) {
  fail('Missing dist/_redirects. Run npm run build first.');
}

const distRedirectLine =
  fs
    .readFileSync(distRedirectsPath, 'utf8')
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0)
    ?.trim() ?? '';
if (distRedirectLine !== '/* /app-shell.html 200') {
  fail(`dist/_redirects must be '/* /app-shell.html 200' (found: ${distRedirectLine}).`);
}

const netlifyPath = path.join(repoRoot, 'netlify.toml');
if (!fs.existsSync(netlifyPath)) {
  fail('Missing netlify.toml at repo root.');
}

const netlifyContent = fs.readFileSync(netlifyPath, 'utf8');
const catchAllRedirect =
  /\[\[redirects\]\]\s*\n\s*from\s*=\s*"\/\*"\s*\n\s*to\s*=\s*"\/app-shell\.html"\s*\n\s*status\s*=\s*200/;
if (!catchAllRedirect.test(netlifyContent)) {
  fail(
    'netlify.toml must contain a [[redirects]] block with from="/*", to="/app-shell.html", status=200.'
  );
}

console.log(
  '[OK] SPA routing contract: dist/app-shell.html; Vercel -> /app-shell (extensionless source, cleanUrls); public/_redirects and dist/_redirects -> /app-shell.html; netlify.toml catch-all -> /app-shell.html.'
);
