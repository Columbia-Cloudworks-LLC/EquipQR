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

const CATCH_ALL_REDIRECT_RULE = '/* /app-shell.html 200';

/** @param {string} content */
function assertCatchAllRedirectsRule(content, label) {
  const hasRule = content.split(/\r?\n/).some((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return false;
    }
    return trimmed === CATCH_ALL_REDIRECT_RULE;
  });

  if (!hasRule) {
    fail(
      `${label} must include a catch-all SPA rule '${CATCH_ALL_REDIRECT_RULE}' (blank lines and # comments are ignored).`
    );
  }
}

/** @param {string} block */
function stripFullLineComments(block) {
  return block
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('#');
    })
    .join('\n');
}

/** @param {string} block */
export function blockHasCatchAllRedirect(block) {
  const activeBlock = stripFullLineComments(block);
  const hasFrom = /\bfrom\s*=\s*["']\/\*["']/.test(activeBlock);
  const hasTo = /\bto\s*=\s*["']\/app-shell\.html["']/.test(activeBlock);
  const hasStatus = /\bstatus\s*=\s*200\b/.test(activeBlock);
  return hasFrom && hasTo && hasStatus;
}

/** @param {string} content */
function assertNetlifyCatchAllRedirect(content) {
  const blocks = content.split(/\[\[redirects\]\]/).slice(1);
  const hasCatchAll = blocks.some((block) => blockHasCatchAllRedirect(block));

  if (!hasCatchAll) {
    fail(
      'netlify.toml must contain a [[redirects]] block with from="/*", to="/app-shell.html", and status=200 (key order and extra keys are allowed).'
    );
  }
}

export function verifySpaShellRouting() {
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

  assertCatchAllRedirectsRule(fs.readFileSync(redirectsPath, 'utf8'), 'public/_redirects');

  const distRedirectsPath = path.join(repoRoot, 'dist', '_redirects');
  if (!fs.existsSync(distRedirectsPath)) {
    fail('Missing dist/_redirects. Run npm run build first.');
  }

  assertCatchAllRedirectsRule(fs.readFileSync(distRedirectsPath, 'utf8'), 'dist/_redirects');

  const netlifyPath = path.join(repoRoot, 'netlify.toml');
  if (!fs.existsSync(netlifyPath)) {
    fail('Missing netlify.toml at repo root.');
  }

  assertNetlifyCatchAllRedirect(fs.readFileSync(netlifyPath, 'utf8'));

  console.log(
    '[OK] SPA routing contract: dist/app-shell.html; Vercel -> /app-shell (extensionless source, cleanUrls); public/_redirects and dist/_redirects -> /app-shell.html; netlify.toml catch-all -> /app-shell.html.'
  );
}

const isMain =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMain) {
  verifySpaShellRouting();
}
