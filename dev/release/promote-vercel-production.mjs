#!/usr/bin/env node
/**
 * Promote a READY Vercel deployment to production traffic (equipqr.app).
 * Used by `.github/workflows/production-release-readiness.yml` after migrations,
 * schema drift, and wait-for-vercel-deployment succeed.
 *
 * Env (required):
 *   VERCEL_TOKEN
 *   VERCEL_DEPLOYMENT_URL or VERCEL_DEPLOYMENT_ID — deployment to promote
 *
 * Env (optional):
 *   VERCEL_TEAM_ID — default Columbia Cloudworks team id
 *   VERCEL_PROJECT_ID — default equipqr project id
 *   VERCEL_BRANCH — default main
 *   GITHUB_SHA / VERCEL_COMMIT_SHA — verify promoted deployment matches commit
 *   VERCEL_PROMOTE_TIMEOUT — CLI wait timeout (default 5m)
 *   VERCEL_VERIFY_TIMEOUT_MS — post-promote verification window (default 60000)
 *   VERCEL_FETCH_TIMEOUT_MS — per-request HTTP timeout (default 15000)
 *   VERCEL_POLL_INTERVAL_MS — retry interval while waiting for production metadata to settle (default 5000)
 */

import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const DEFAULT_TEAM = 'team_78VeGDURoofThjZNJOKEBpP5';
const DEFAULT_PROJECT = 'prj_P9hRun4B2OdGy8ACCnb0f7jNG6UA';
const VERCEL_CLI = 'vercel@51.6.1';

function usage() {
  process.stdout.write(`Usage: promote-vercel-production.mjs

Environment:
  VERCEL_TOKEN                      Bearer token (required)
  VERCEL_DEPLOYMENT_URL             READY deployment URL (preferred)
  VERCEL_DEPLOYMENT_ID              Deployment uid (dpl_...) if URL omitted
  VERCEL_TEAM_ID                    Default: ${DEFAULT_TEAM}
  VERCEL_PROJECT_ID                 Default: ${DEFAULT_PROJECT}
  VERCEL_BRANCH                     Default: main
  GITHUB_SHA / VERCEL_COMMIT_SHA    Optional commit verification
  VERCEL_PROMOTE_TIMEOUT            Default: 5m
  VERCEL_VERIFY_TIMEOUT_MS          Default: 60000
  VERCEL_FETCH_TIMEOUT_MS           Default: 15000
  VERCEL_POLL_INTERVAL_MS           Default: 5000
`);
}

function deploymentPromoteRefFromEnv() {
  const url = (process.env.VERCEL_DEPLOYMENT_URL || '').trim();
  if (url) return url;
  const id = (process.env.VERCEL_DEPLOYMENT_ID || '').trim();
  if (id) return id;
  return '';
}

function commitRefMatches(meta, branch) {
  const ref = meta?.githubCommitRef || '';
  return ref === branch || ref === `refs/heads/${branch}`;
}

function deploymentPublicUrl(d) {
  const u = d?.url;
  if (!u) return '';
  return u.startsWith('http://') || u.startsWith('https://') ? u : `https://${u}`;
}

function deploymentCommitSha(d) {
  const metaSha = d?.meta?.githubCommitSha;
  if (typeof metaSha === 'string' && metaSha.trim()) return metaSha.trim();
  const gitSourceSha = d?.gitSource?.sha;
  if (typeof gitSourceSha === 'string' && gitSourceSha.trim()) return gitSourceSha.trim();
  return '';
}

function deploymentState(d) {
  return d?.readyState || d?.state || '';
}

function deploymentTarget(d) {
  return d?.target || '';
}

function deploymentId(d) {
  return d?.uid || d?.id || '';
}

function deploymentCreatedAt(d) {
  return d?.createdAt || d?.created || 0;
}

function formatShortSha(sha) {
  return sha ? sha.slice(0, 7) : 'unknown';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listDeployments({
  token,
  teamId,
  projectId,
  target,
  timeoutMs,
}) {
  const u = new URL('https://api.vercel.com/v7/deployments');
  u.searchParams.set('teamId', teamId);
  u.searchParams.set('projectId', projectId);
  u.searchParams.set('target', target);
  u.searchParams.set('limit', '10');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(u, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        transient: res.status === 429 || res.status >= 500,
        detail: `Vercel API ${res.status}: ${text.slice(0, 400)}`,
      };
    }
    return { ok: true, deployments: JSON.parse(text).deployments || [] };
  } catch (err) {
    const message =
      err && typeof err === 'object' && 'name' in err && err.name === 'AbortError'
        ? `request timeout after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : String(err);
    return { ok: false, transient: true, detail: message };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function pickProductionDeployment(deployments, branch) {
  const productionDeployments = deployments.filter((deployment) => deploymentTarget(deployment) === 'production');
  if (productionDeployments.length === 0) return null;

  const branchMatches = branch
    ? productionDeployments.filter((deployment) => commitRefMatches(deployment?.meta || {}, branch))
    : [];
  const candidates = branchMatches.length > 0 ? branchMatches : productionDeployments;

  return [...candidates].sort((a, b) => deploymentCreatedAt(b) - deploymentCreatedAt(a))[0];
}

export function evaluateProductionDeployment({ deployment, sha }) {
  if (!deployment) {
    return {
      ok: false,
      detail: 'No production deployment found for post-promote verification.',
    };
  }

  const target = deploymentTarget(deployment);
  if (target !== 'production') {
    return {
      ok: false,
      detail: `Promoted deployment target is "${target || 'unset'}", expected production.`,
    };
  }

  const state = deploymentState(deployment);
  if (state !== 'READY') {
    return {
      ok: false,
      detail: `Promoted deployment not READY (${state || 'unknown'}).`,
    };
  }

  if (!sha) {
    return { ok: true, detail: '' };
  }

  const metaSha = deploymentCommitSha(deployment);
  if (!metaSha) {
    return {
      ok: false,
      detail: 'Promoted deployment is missing commit metadata for post-promote verification.',
    };
  }

  if (metaSha !== sha) {
    return {
      ok: false,
      detail: `Promoted deployment commit mismatch: expected ${formatShortSha(sha)}, got ${formatShortSha(metaSha)}.`,
    };
  }

  return { ok: true, detail: '' };
}

export async function verifyProductionDeployment({
  token,
  teamId,
  projectId,
  branch,
  sha,
  verifyTimeoutMs,
  fetchTimeoutMs,
  pollIntervalMs,
}) {
  const deadline = Date.now() + verifyTimeoutMs;
  let lastFailure = 'No production deployment found for post-promote verification.';

  while (Date.now() < deadline) {
    const listed = await listDeployments({
      token,
      teamId,
      projectId,
      target: 'production',
      timeoutMs: fetchTimeoutMs,
    });

    if (!listed.ok) {
      if (!listed.transient) {
        process.stderr.write(
          `::error title=promote-vercel-production::Post-promote verification failed: ${listed.detail}\n`,
        );
        return false;
      }

      lastFailure = `Post-promote verification transient failure: ${listed.detail}`;
    } else {
      const deployment = pickProductionDeployment(listed.deployments, branch);
      const evaluation = evaluateProductionDeployment({ deployment, sha });

      if (evaluation.ok) {
        const verifiedId = deploymentId(deployment);
        const verifiedUrl = deploymentPublicUrl(deployment);
        process.stdout.write(
          `::notice::Verified production deployment ${verifiedId || '(no id)'} ${verifiedUrl || ''}`.trim() + '\n',
        );
        return true;
      }

      lastFailure = evaluation.detail;
    }

    if (Date.now() + pollIntervalMs >= deadline) {
      break;
    }
    await sleep(pollIntervalMs);
  }

  process.stderr.write(`::error title=promote-vercel-production::${lastFailure}\n`);
  return false;
}

function runVercelPromote({ deploymentRef, token, teamId, timeout }) {
  const args = [
    '--yes',
    VERCEL_CLI,
    'promote',
    deploymentRef,
    '--yes',
    '--timeout',
    timeout,
    '-t',
    token,
    '-S',
    teamId,
    '--non-interactive',
  ];

  process.stdout.write(
    `Running vercel promote for ${deploymentRef} (timeout ${timeout}, team ${teamId}).\n`,
  );

  const result = spawnSync('npx', args, {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    process.stderr.write(
      `::error title=promote-vercel-production::Failed to spawn npx: ${result.error.message}\n`,
    );
    return false;
  }
  if (result.status !== 0) {
    process.stderr.write(
      `::error title=promote-vercel-production::vercel promote exited with code ${result.status ?? 'unknown'}.\n`,
    );
    return false;
  }
  return true;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    usage();
    process.exit(0);
  }

  const token = process.env.VERCEL_TOKEN || '';
  const teamId = process.env.VERCEL_TEAM_ID || DEFAULT_TEAM;
  const projectId = process.env.VERCEL_PROJECT_ID || DEFAULT_PROJECT;
  const branch = process.env.VERCEL_BRANCH || 'main';
  const timeout = (process.env.VERCEL_PROMOTE_TIMEOUT || '5m').trim() || '5m';
  const sha = process.env.GITHUB_SHA || process.env.VERCEL_COMMIT_SHA || '';
  const verifyTimeoutMs = Math.max(
    5_000,
    Number.parseInt(process.env.VERCEL_VERIFY_TIMEOUT_MS || '60000', 10) || 60_000,
  );
  const fetchTimeoutMs = Math.max(
    5_000,
    Number.parseInt(process.env.VERCEL_FETCH_TIMEOUT_MS || '15000', 10) || 15_000,
  );
  const pollIntervalMs = Math.max(
    1_000,
    Number.parseInt(process.env.VERCEL_POLL_INTERVAL_MS || '5000', 10) || 5_000,
  );
  const deploymentPromoteRef = deploymentPromoteRefFromEnv();

  if (!token || token.startsWith('op://')) {
    process.stderr.write(
      '::error title=promote-vercel-production::VERCEL_TOKEN missing or unresolved (still an op:// reference).\n',
    );
    process.exit(1);
  }
  if (!deploymentPromoteRef) {
    process.stderr.write(
      '::error title=promote-vercel-production::VERCEL_DEPLOYMENT_URL or VERCEL_DEPLOYMENT_ID is required.\n',
    );
    process.exit(1);
  }

  const promoted = runVercelPromote({ deploymentRef: deploymentPromoteRef, token, teamId, timeout });
  if (!promoted) {
    process.exit(1);
  }

  const verified = await verifyProductionDeployment({
    token,
    teamId,
    projectId,
    branch,
    sha,
    verifyTimeoutMs,
    fetchTimeoutMs,
    pollIntervalMs,
  });
  if (!verified) {
    process.exit(1);
  }

  process.stdout.write(
    '::notice::Vercel production promotion complete — equipqr.app should now serve this build.\n',
  );
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(
      `::error title=promote-vercel-production::${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
}
