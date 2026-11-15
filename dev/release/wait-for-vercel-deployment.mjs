#!/usr/bin/env node
/**
 * Poll the Vercel REST API until a deployment for a given commit on `main`
 * reaches READY, or timeout. Used by `.github/workflows/production-release-readiness.yml`.
 *
 * Env (required unless noted):
 *   VERCEL_TOKEN
 *   GITHUB_SHA or VERCEL_COMMIT_SHA — full git SHA
 *
 * Env (optional):
 *   VERCEL_TEAM_ID — default Columbia Cloudworks team id
 *   VERCEL_PROJECT_ID — default equipqr SPA project id
 *   VERCEL_BRANCH — default main
 *   VERCEL_POLL_INTERVAL_SEC — default 20
 *   VERCEL_WAIT_TIMEOUT_MINUTES — default 45
 *   VERCEL_FETCH_TIMEOUT_MS — per-request HTTP timeout (default 45000)
 *
 * On success, prints validated `deployment_url=` / `deployment_id=` lines to stdout
 * for the workflow step to append to GITHUB_OUTPUT (avoids CodeQL http-to-file in JS).
 *
 * Does not run `vercel promote` — see promote-vercel-production.mjs.
 */

import { runAsCliEntry } from '../lib/scriptRuntime.mjs';
import {
  DEFAULT_TEAM,
  DEFAULT_PROJECT,
  sleep,
  envIntAtLeast,
  exitIfHelpRequested,
  readVercelEnv,
  fetchVercelWithTimeout,
} from '../lib/vercelDeployments.mjs';

function usage() {
  process.stdout.write(`Usage: wait-for-vercel-deployment.mjs

Environment:
  VERCEL_TOKEN                 Bearer token (required)
  GITHUB_SHA / VERCEL_COMMIT_SHA  Git commit to match (required)
  VERCEL_TEAM_ID               Default: ${DEFAULT_TEAM}
  VERCEL_PROJECT_ID            Default: ${DEFAULT_PROJECT}
  VERCEL_BRANCH                Default: main
  VERCEL_POLL_INTERVAL_SEC     Default: 20
  VERCEL_WAIT_TIMEOUT_MINUTES  Default: 45
  VERCEL_FETCH_TIMEOUT_MS      Default: 45000
`);
}

function deploymentPublicUrl(d) {
  const u = d.url;
  if (!u) return '';
  return u.startsWith('http://') || u.startsWith('https://') ? u : `https://${u}`;
}

function commitRefMatches(meta, branch) {
  const ref = meta.githubCommitRef || '';
  return ref === branch || ref === `refs/heads/${branch}`;
}

function shaMatches(meta, sha) {
  const msha = meta.githubCommitSha || '';
  return msha === sha;
}

function matchingDeploymentsNewestFirst(deployments, sha, branch) {
  return deployments
    .filter((d) => {
      const meta = d.meta || {};
      if (!shaMatches(meta, sha)) return false;
      return commitRefMatches(meta, branch);
    })
    .sort((a, b) => (b.createdAt || b.created || 0) - (a.createdAt || a.created || 0));
}

export function terminalErrorStates(deployments, sha, branch) {
  const matching = matchingDeploymentsNewestFirst(deployments, sha, branch);
  if (matching.length === 0) return [];
  const newest = matching[0];
  const st = newest.readyState || newest.state || '';
  return ['ERROR', 'CANCELED', 'DELETED'].includes(st) ? [newest] : [];
}

export function pickReadyDeployment(deployments, sha, branch) {
  const matching = matchingDeploymentsNewestFirst(deployments, sha, branch).filter((d) => {
    const st = d.readyState || d.state || '';
    return !['CANCELED', 'DELETED'].includes(st);
  });
  if (matching.length === 0) return null;

  // Never pick an older READY deployment while a newer redeploy for the same
  // commit/branch (such as one triggered after syncing VITE_* vars) is still building.
  const newest = matching[0];
  const newestState = newest.readyState || newest.state || '';
  if (newestState !== 'READY') return null;

  const readyAtNewestTimestamp = matching.filter((d) => {
    const st = d.readyState || d.state || '';
    return (
      st === 'READY' &&
      (d.createdAt || d.created || 0) === (newest.createdAt || newest.created || 0)
    );
  });
  const preferNoTarget = readyAtNewestTimestamp.filter((d) => d.target == null);
  return preferNoTarget[0] || newest;
}

/**
 * List deployments from Vercel; transient failures do not exit the process —
 * callers retry until deadline. Auth / client errors exit non‑zero immediately.
 *
 * @param {object} p
 * @returns {Promise<{ ok: true, deployments: any[] } | { ok: false, transient: boolean, detail: string }>}
 */
async function listDeployments({ token, teamId, projectId, sha, branch, timeoutMs }) {
  const u = new URL('https://api.vercel.com/v6/deployments');
  u.searchParams.set('teamId', teamId);
  u.searchParams.set('projectId', projectId);
  u.searchParams.set('sha', sha);
  u.searchParams.set('branch', branch);
  u.searchParams.set('limit', '25');

  return fetchVercelWithTimeout(u, {
    token,
    timeoutMs,
    handleResponse: (res, text) => {
      if (!res.ok) {
        if (res.status === 429 || res.status >= 500) {
          return {
            ok: false,
            transient: true,
            detail: `HTTP ${res.status}: ${text.slice(0, 300)}`,
          };
        }
        return {
          ok: false,
          transient: false,
          detail: `Vercel API ${res.status}: ${text.slice(0, 400)}`,
        };
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return {
          ok: false,
          transient: true,
          detail: `invalid JSON (${text.slice(0, 200)})`,
        };
      }
      return { ok: true, deployments: data.deployments || [] };
    },
  });
}

/** @param {string} name */
function isSafeGithubOutputName(name) {
  return /^[A-Za-z0-9_]+$/.test(name);
}

/** @param {string} value */
function sanitizeGithubOutputScalar(value) {
  return String(value).replace(/[\r\n]/g, '');
}

/** @param {string} raw */
function buildSafeVercelDeploymentUrl(raw) {
  const scalar = sanitizeGithubOutputScalar(raw);
  try {
    const parsed = new URL(scalar);
    if (parsed.protocol !== 'https:') return null;
    if (!parsed.hostname.endsWith('.vercel.app') && !parsed.hostname.endsWith('.equipqr.app')) {
      return null;
    }
    // Reconstruct from parsed parts so CodeQL does not treat API body as a direct file write sink.
    return `https://${parsed.hostname}${parsed.pathname || '/'}${parsed.search || ''}`;
  } catch {
    return null;
  }
}

/** @param {string} raw */
function buildSafeVercelDeploymentId(raw) {
  const scalar = sanitizeGithubOutputScalar(raw);
  const match = /^([A-Za-z0-9_-]+)$/.exec(scalar);
  return match ? match[1] : null;
}

function formatGithubStepOutputLines(name, value) {
  if (!name || !isSafeGithubOutputName(name)) return [];

  let safeValue = null;
  if (name === 'deployment_url') {
    safeValue = buildSafeVercelDeploymentUrl(value);
  } else if (name === 'deployment_id') {
    safeValue = buildSafeVercelDeploymentId(value);
  } else {
    return [];
  }

  if (!safeValue) return [];
  return [`${name}=${safeValue}`];
}

async function main() {
  exitIfHelpRequested(usage);

  const { token, teamId, projectId, branch } = readVercelEnv();
  const sha = process.env.GITHUB_SHA || process.env.VERCEL_COMMIT_SHA || '';
  const intervalSec = envIntAtLeast('VERCEL_POLL_INTERVAL_SEC', 20, 5);
  const timeoutMin = envIntAtLeast('VERCEL_WAIT_TIMEOUT_MINUTES', 45, 1);
  const fetchTimeoutMs = envIntAtLeast('VERCEL_FETCH_TIMEOUT_MS', 45_000, 5_000);

  if (!token) {
    process.stderr.write(
      '::error title=wait-for-vercel-deployment::VERCEL_TOKEN is missing.\n',
    );
    process.exit(1);
  }
  if (!sha) {
    process.stderr.write(
      '::error title=wait-for-vercel-deployment::GITHUB_SHA / VERCEL_COMMIT_SHA is required.\n',
    );
    process.exit(1);
  }

  const deadline = Date.now() + timeoutMin * 60_000;
  let attempt = 0;

  process.stderr.write(
    `Polling Vercel for READY deployment: project=${projectId} branch=${branch} sha=${sha.slice(0, 7)}\n`,
  );

  while (Date.now() < deadline) {
    attempt += 1;

    const listed = await listDeployments({
      token,
      teamId,
      projectId,
      sha,
      branch,
      timeoutMs: fetchTimeoutMs,
    });

    if (!listed.ok) {
      if (!listed.transient) {
        process.stderr.write(
          `::error title=wait-for-vercel-deployment::${listed.detail}\n`,
        );
        process.exit(1);
      }

      process.stderr.write(
        `::warning title=wait-for-vercel-deployment::Transient Vercel list failure (attempt ${attempt}): ${listed.detail}. Retrying...\n`,
      );

      if (attempt === 1 || attempt % 5 === 0) {
        process.stderr.write(
          `[wait] attempt ${attempt}: still polling after transient API error (${intervalSec}s interval)\n`,
        );
      }
      await sleep(intervalSec * 1000);
      continue;
    }

    const { deployments } = listed;

    const failed = terminalErrorStates(deployments, sha, branch);
    if (failed.length > 0) {
      const f = failed[0];
      const msg = f.errorMessage || f.errorCode || 'deployment failed';
      process.stderr.write(
        `::error title=wait-for-vercel-deployment::Vercel deployment failed (${f.readyState || f.state}): ${msg}\n`,
      );
      process.exit(1);
    }

    const ready = pickReadyDeployment(deployments, sha, branch);
    if (ready) {
      const url = deploymentPublicUrl(ready);
      if (!url || typeof url !== 'string' || url.trim() === '') {
        process.stderr.write(
          '::error title=wait-for-vercel-deployment::READY deployment missing public URL — cannot confirm deployment for operator.\n',
        );
        process.exit(1);
      }

      const deploymentId = ready.uid || ready.id || '';
      const outputLines = [
        ...formatGithubStepOutputLines('deployment_url', url),
        ...(deploymentId ? formatGithubStepOutputLines('deployment_id', deploymentId) : []),
      ];
      if (outputLines.length === 0) {
        process.stderr.write(
          '::error title=wait-for-vercel-deployment::READY deployment URL/id failed validation — cannot emit workflow outputs.\n',
        );
        process.exit(1);
      }

      for (const line of outputLines) {
        process.stdout.write(`${line}\n`);
      }

      process.stderr.write(`::notice::Vercel deployment READY: ${url}\n`);
      if (deploymentId) {
        process.stderr.write(`::notice::Vercel deployment id: ${deploymentId}\n`);
      }
      process.stderr.write(
        `Production release readiness will promote this deployment to equipqr.app in the next workflow step.\n`,
      );

      process.exit(0);
    }

    if (attempt === 1 || attempt % 5 === 0) {
      process.stderr.write(
        `[wait] attempt ${attempt}: no READY deployment yet for this commit (interval ${intervalSec}s)\n`,
      );
    }
    await sleep(intervalSec * 1000);
  }

  process.stderr.write(
    `::error title=wait-for-vercel-deployment::Timed out after ${timeoutMin}m waiting for READY deployment for ${sha.slice(0, 7)} on ${branch}.\n`,
  );
  process.exit(1);
}

runAsCliEntry(import.meta.url, main, 'wait-for-vercel-deployment');
