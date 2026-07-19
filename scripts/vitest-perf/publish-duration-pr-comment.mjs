#!/usr/bin/env node
/**
 * Upsert a sticky PR comment with the Vitest duration markdown report.
 * Expects tmp/vitest-perf/latest-report.md (from report-vitest-durations.mjs).
 *
 * Soft-fails (exit 0) on 403/404 so the Actions job summary still counts as success
 * when comment write is unavailable (forks / restricted tokens).
 *
 * Env:
 *   GITHUB_TOKEN / GH_TOKEN — required
 *   GITHUB_REPOSITORY — owner/repo (set by Actions)
 *   PR_NUMBER — pull request number
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PR_COMMENT_MARKER } from './report-vitest-durations.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const mdPath = path.join(repoRoot, 'tmp', 'vitest-perf', 'latest-report.md');

/**
 * Paginate until the sticky marker is found (or pages are exhausted).
 * @param {string} url
 * @param {Record<string, string>} headers
 * @returns {Promise<{ id: number; body?: string } | null>}
 */
async function findStickyComment(url, headers) {
  let nextUrl = `${url}${url.includes('?') ? '&' : '?'}per_page=100`;

  while (nextUrl) {
    const listRes = await fetch(nextUrl, { headers });
    if (listRes.status === 403 || listRes.status === 404) {
      console.error(`[vitest-perf] list comments skipped (HTTP ${listRes.status})`);
      return null;
    }
    if (!listRes.ok) {
      throw new Error(`list comments failed: ${listRes.status} ${await listRes.text()}`);
    }
    const page = await listRes.json();
    if (!Array.isArray(page)) {
      throw new Error('list comments returned non-array payload');
    }
    const hit = page.find((c) => typeof c.body === 'string' && c.body.includes(PR_COMMENT_MARKER));
    if (hit) {
      return hit;
    }

    const link = listRes.headers.get('link') ?? '';
    const nextMatch = link.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = nextMatch?.[1] ?? '';
  }

  return null;
}

/**
 * @param {Response} res
 * @param {string} action
 * @returns {Promise<boolean>} true when caller should soft-skip
 */
async function isSoftSkip(res, action) {
  if (res.status === 403 || res.status === 404) {
    console.error(`[vitest-perf] ${action} skipped (HTTP ${res.status})`);
    return true;
  }
  return false;
}

async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const prNumber = Number(process.env.PR_NUMBER);

  if (!token) {
    throw new Error('GITHUB_TOKEN or GH_TOKEN is required');
  }
  if (!repo || !repo.includes('/')) {
    throw new Error('GITHUB_REPOSITORY must be set (owner/repo)');
  }
  if (!Number.isFinite(prNumber) || prNumber < 1) {
    throw new Error('PR_NUMBER must be a positive integer');
  }
  if (!fs.existsSync(mdPath)) {
    throw new Error(`Missing report markdown: ${mdPath}`);
  }

  const markdown = fs.readFileSync(mdPath, 'utf8').trimEnd();
  const body = `${PR_COMMENT_MARKER}\n${markdown}\n`;
  const [owner, name] = repo.split('/');
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'equipqr-vitest-perf',
  };

  const listUrl = `https://api.github.com/repos/${owner}/${name}/issues/${prNumber}/comments`;
  const existing = await findStickyComment(listUrl, headers);

  if (existing) {
    const patchRes = await fetch(
      `https://api.github.com/repos/${owner}/${name}/issues/comments/${existing.id}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      },
    );
    if (patchRes.ok) {
      console.log(`[vitest-perf] updated PR comment ${existing.id}`);
      return;
    }
    // Comment may have been deleted between list and patch — fall through to create.
    if (!(await isSoftSkip(patchRes, 'update comment'))) {
      throw new Error(`update comment failed: ${patchRes.status} ${await patchRes.text()}`);
    }
  }

  const createRes = await fetch(`https://api.github.com/repos/${owner}/${name}/issues/${prNumber}/comments`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  if (createRes.ok) {
    const created = await createRes.json();
    console.log(`[vitest-perf] created PR comment ${created.id}`);
    return;
  }
  if (await isSoftSkip(createRes, 'create comment')) {
    return;
  }
  throw new Error(`create comment failed: ${createRes.status} ${await createRes.text()}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  // Permission / missing-resource failures must not fail the duration report job.
  if (/\b(403|404)\b/.test(message) || /skipped \(HTTP (403|404)\)/.test(message)) {
    process.exit(0);
  }
  process.exit(1);
});
