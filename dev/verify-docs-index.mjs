#!/usr/bin/env node

/**
 * Verify the slim AGENTS.md index and the github.equipqr.app redirect rule.
 *
 * Always checks:
 * - AGENTS.md markdown links resolve to files in this checkout
 * - vercel.json has a host-conditioned permanent redirect from
 *   github.equipqr.app to the canonical GitHub repository
 *
 * Optional live check (`--live` or VERIFY_GITHUB_SHORTCUT_LIVE=1):
 * - HTTPS HEAD/GET to github.equipqr.app returns a redirect to the repo
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const GITHUB_SHORTCUT_HOST = 'github.equipqr.app';
export const GITHUB_REPO_URL = 'https://github.com/Columbia-Cloudworks-LLC/EquipQR';

const MARKDOWN_LINK_RE = /\[[^\]]*]\(([^)]+)\)/g;

/** @param {string} message */
function fail(message) {
  console.error(`verify-docs-index: ${message}`);
  process.exit(1);
}

/**
 * @param {string} markdown
 * @returns {string[]}
 */
export function collectLocalMarkdownHrefs(markdown) {
  const hrefs = [];
  for (const match of markdown.matchAll(MARKDOWN_LINK_RE)) {
    const href = String(match[1] ?? '').trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) {
      continue;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
      continue;
    }
    hrefs.push(href);
  }
  return hrefs;
}

/**
 * @param {string} href
 * @param {string} fromFile
 * @returns {string}
 */
export function resolveLocalMarkdownHref(href, fromFile) {
  const withoutAnchor = href.split('#')[0] ?? href;
  return path.resolve(path.dirname(fromFile), withoutAnchor);
}

/**
 * @param {{ redirects?: Array<{ source?: string; destination?: string; permanent?: boolean; has?: Array<{ type?: string; value?: string }> }> }} vercel
 */
export function findGithubShortcutRedirect(vercel) {
  return (vercel.redirects ?? []).find((entry) => {
    if (entry.destination !== GITHUB_REPO_URL) {
      return false;
    }
    if (entry.permanent !== true) {
      return false;
    }
    return (entry.has ?? []).some(
      (condition) => condition.type === 'host' && condition.value === GITHUB_SHORTCUT_HOST,
    );
  });
}

/**
 * @param {string} location
 * @param {string} expected
 */
export function locationMatchesRepo(location, expected) {
  const normalized = String(location ?? '').trim().replace(/\/+$/, '');
  const wanted = expected.replace(/\/+$/, '');
  return normalized === wanted;
}

/**
 * @param {{ status: number; location: string | null }} response
 * @param {string} expectedRepo
 */
export function isGithubShortcutLiveRedirect(response, expectedRepo = GITHUB_REPO_URL) {
  if (![301, 302, 307, 308].includes(response.status)) {
    return false;
  }
  return locationMatchesRepo(response.location ?? '', expectedRepo);
}

/**
 * @param {string} agentsMarkdown
 * @param {string} agentsPath
 * @returns {string[]}
 */
export function collectBrokenAgentsLinks(agentsMarkdown, agentsPath) {
  const broken = [];
  for (const href of collectLocalMarkdownHrefs(agentsMarkdown)) {
    const resolved = resolveLocalMarkdownHref(href, agentsPath);
    if (!fs.existsSync(resolved)) {
      broken.push(href);
    }
  }
  return broken;
}

function verifyDocsIndexConfig() {
  const agentsPath = path.join(repoRoot, 'AGENTS.md');
  if (!fs.existsSync(agentsPath)) {
    fail('Missing AGENTS.md at repo root.');
  }

  const agentsMarkdown = fs.readFileSync(agentsPath, 'utf8');
  const broken = collectBrokenAgentsLinks(agentsMarkdown, agentsPath);
  if (broken.length > 0) {
    fail(`AGENTS.md links do not resolve: ${broken.join(', ')}`);
  }

  const vercelPath = path.join(repoRoot, 'vercel.json');
  if (!fs.existsSync(vercelPath)) {
    fail('Missing vercel.json at repo root.');
  }

  /** @type {{ redirects?: unknown }} */
  let vercel;
  try {
    vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  } catch {
    fail('vercel.json is not valid JSON.');
  }

  const redirect = findGithubShortcutRedirect(vercel);
  if (!redirect) {
    fail(
      `vercel.json must permanently redirect host ${GITHUB_SHORTCUT_HOST} to ${GITHUB_REPO_URL}.`,
    );
  }

  const firstRedirect = (vercel.redirects ?? [])[0];
  if (firstRedirect !== redirect) {
    fail(
      `The ${GITHUB_SHORTCUT_HOST} redirect must be the first redirects[] entry so the SPA fallback cannot intercept it.`,
    );
  }

  console.log(
    `[OK] AGENTS.md links resolve (${collectLocalMarkdownHrefs(agentsMarkdown).length} local); `
      + `${GITHUB_SHORTCUT_HOST} → ${GITHUB_REPO_URL} (permanent host redirect).`,
  );
}

/**
 * @param {string} url
 */
async function fetchRedirectHeaders(url) {
  const response = await fetch(url, { method: 'HEAD', redirect: 'manual' });
  let location = response.headers.get('location');
  let status = response.status;

  // Some edges omit Location on HEAD; retry GET without following.
  if (!location && (status === 405 || status === 200 || status === 204)) {
    const getResponse = await fetch(url, { method: 'GET', redirect: 'manual' });
    status = getResponse.status;
    location = getResponse.headers.get('location');
  }

  return { status, location };
}

async function verifyGithubShortcutLive() {
  const url = `https://${GITHUB_SHORTCUT_HOST}/`;
  let result;
  try {
    result = await fetchRedirectHeaders(url);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(`Live check failed for ${url}: ${detail}`);
  }

  if (!isGithubShortcutLiveRedirect(result)) {
    fail(
      `Live check: ${url} returned ${result.status} Location=${result.location ?? '(none)'}; `
        + `expected a 3xx Location of ${GITHUB_REPO_URL}.`,
    );
  }

  console.log(`[OK] Live ${url} → ${result.location} (${result.status}).`);
}

function wantsLiveCheck(argv = process.argv.slice(2)) {
  if (argv.includes('--live')) {
    return true;
  }
  const flag = String(process.env.VERIFY_GITHUB_SHORTCUT_LIVE ?? '').trim().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

async function verifyDocsIndex({ live = wantsLiveCheck() } = {}) {
  verifyDocsIndexConfig();
  if (live) {
    await verifyGithubShortcutLive();
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMain) {
  await verifyDocsIndex();
}
