#!/usr/bin/env node
/**
 * Upsert a sticky PR comment with the Vitest duration markdown report.
 * Expects tmp/vitest-perf/latest-report.md (from report-vitest-durations.mjs).
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

  const listUrl = `https://api.github.com/repos/${owner}/${name}/issues/${prNumber}/comments?per_page=100`;
  const listRes = await fetch(listUrl, { headers });
  if (!listRes.ok) {
    throw new Error(`list comments failed: ${listRes.status} ${await listRes.text()}`);
  }
  /** @type {Array<{ id: number; body?: string }>} */
  const comments = await listRes.json();
  const existing = comments.find((c) => typeof c.body === 'string' && c.body.includes(PR_COMMENT_MARKER));

  if (existing) {
    const patchRes = await fetch(
      `https://api.github.com/repos/${owner}/${name}/issues/comments/${existing.id}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      },
    );
    if (!patchRes.ok) {
      throw new Error(`update comment failed: ${patchRes.status} ${await patchRes.text()}`);
    }
    console.log(`[vitest-perf] updated PR comment ${existing.id}`);
    return;
  }

  const createRes = await fetch(`https://api.github.com/repos/${owner}/${name}/issues/${prNumber}/comments`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  if (!createRes.ok) {
    throw new Error(`create comment failed: ${createRes.status} ${await createRes.text()}`);
  }
  const created = await createRes.json();
  console.log(`[vitest-perf] created PR comment ${created.id}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
