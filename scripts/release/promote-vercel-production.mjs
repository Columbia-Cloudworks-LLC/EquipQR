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
 *   GITHUB_SHA / VERCEL_COMMIT_SHA — verify promoted deployment matches commit
 *   VERCEL_PROMOTE_TIMEOUT — CLI wait timeout (default 5m)
 */

import { spawnSync } from 'node:child_process';

const DEFAULT_TEAM = 'team_78VeGDURoofThjZNJOKEBpP5';
const VERCEL_CLI = 'vercel@51.6.1';

function usage() {
  process.stdout.write(`Usage: promote-vercel-production.mjs

Environment:
  VERCEL_TOKEN                      Bearer token (required)
  VERCEL_DEPLOYMENT_URL             READY deployment URL (preferred)
  VERCEL_DEPLOYMENT_ID              Deployment uid (dpl_...) if URL omitted
  VERCEL_TEAM_ID                    Default: ${DEFAULT_TEAM}
  GITHUB_SHA / VERCEL_COMMIT_SHA    Optional commit verification
  VERCEL_PROMOTE_TIMEOUT            Default: 5m
`);
}

function deploymentRefFromEnv() {
  const url = (process.env.VERCEL_DEPLOYMENT_URL || '').trim();
  if (url) return url;
  const id = (process.env.VERCEL_DEPLOYMENT_ID || '').trim();
  if (id) return id;
  return '';
}

async function fetchDeployment({ token, teamId, deploymentId, timeoutMs }) {
  const u = new URL(`https://api.vercel.com/v13/deployments/${encodeURIComponent(deploymentId)}`);
  u.searchParams.set('teamId', teamId);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(u, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, detail: `Vercel API ${res.status}: ${text.slice(0, 400)}` };
    }
    return { ok: true, deployment: JSON.parse(text) };
  } catch (err) {
    const message =
      err && typeof err === 'object' && 'name' in err && err.name === 'AbortError'
        ? `request timeout after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : String(err);
    return { ok: false, detail: message };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function verifyPromotedDeployment({ token, teamId, deploymentRef, sha }) {
  if (!sha) return true;

  const fetched = await fetchDeployment({
    token,
    teamId,
    deploymentId: deploymentRef,
    timeoutMs: 45_000,
  });
  if (!fetched.ok) {
    process.stdout.write(
      `::warning title=promote-vercel-production::Post-promote verification skipped: ${fetched.detail}\n`,
    );
    return true;
  }

  const d = fetched.deployment;
  const metaSha = d?.meta?.githubCommitSha || '';
  const target = d?.target || '';
  const state = d?.readyState || d?.state || '';

  if (metaSha && metaSha !== sha) {
    process.stderr.write(
      `::error title=promote-vercel-production::Promoted deployment commit mismatch: expected ${sha.slice(0, 7)}, got ${metaSha.slice(0, 7)}.\n`,
    );
    return false;
  }
  if (state !== 'READY') {
    process.stderr.write(
      `::error title=promote-vercel-production::Promoted deployment not READY (${state}).\n`,
    );
    return false;
  }
  if (target !== 'production') {
    process.stderr.write(
      `::error title=promote-vercel-production::Promoted deployment target is "${target || 'unset'}", expected production.\n`,
    );
    return false;
  }

  return true;
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
  const timeout = (process.env.VERCEL_PROMOTE_TIMEOUT || '5m').trim() || '5m';
  const sha = process.env.GITHUB_SHA || process.env.VERCEL_COMMIT_SHA || '';
  const deploymentRef = deploymentRefFromEnv();

  if (!token || token.startsWith('op://')) {
    process.stderr.write(
      '::error title=promote-vercel-production::VERCEL_TOKEN missing or unresolved (still an op:// reference).\n',
    );
    process.exit(1);
  }
  if (!deploymentRef) {
    process.stderr.write(
      '::error title=promote-vercel-production::VERCEL_DEPLOYMENT_URL or VERCEL_DEPLOYMENT_ID is required.\n',
    );
    process.exit(1);
  }

  const promoted = runVercelPromote({ deploymentRef, token, teamId, timeout });
  if (!promoted) {
    process.exit(1);
  }

  const verified = await verifyPromotedDeployment({
    token,
    teamId,
    deploymentRef,
    sha,
  });
  if (!verified) {
    process.exit(1);
  }

  process.stdout.write(
    '::notice::Vercel production promotion complete — equipqr.app should now serve this build.\n',
  );
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(
    `::error title=promote-vercel-production::${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
