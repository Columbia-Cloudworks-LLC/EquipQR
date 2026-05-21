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

/** @type {{ rewrites?: Array<{ destination?: string }> }} */
let vercel;
try {
  vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
} catch {
  fail('vercel.json is not valid JSON.');
}

const rewrite = (vercel.rewrites ?? []).find((entry) =>
  /app-shell|index\.html/.test(entry.destination ?? '')
);
if (!rewrite) {
  fail('vercel.json has no SPA fallback rewrite.');
}
if (rewrite.destination !== '/app-shell') {
  fail(
    `vercel.json rewrite destination must be /app-shell (found: ${rewrite.destination}).`
  );
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

const netlifyPath = path.join(repoRoot, 'netlify.toml');
if (!fs.existsSync(netlifyPath)) {
  fail('Missing netlify.toml at repo root.');
}

const netlifyContent = fs.readFileSync(netlifyPath, 'utf8');
if (!/to\s*=\s*"\/app-shell\.html"/.test(netlifyContent)) {
  fail('netlify.toml SPA redirect must target /app-shell.html.');
}

console.log(
  '[OK] SPA routing contract: dist/app-shell.html; Vercel -> /app-shell; Netlify/_redirects -> /app-shell.html.'
);
