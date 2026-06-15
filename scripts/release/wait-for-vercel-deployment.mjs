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
 * When GITHUB_OUTPUT is set (GitHub Actions), writes deployment_url and
 * deployment_id for the follow-up promote step.
 *
 * Does not run `vercel promote` — see promote-vercel-production.mjs.
 */

import { appendFileSync } from 'node:fs';

const DEFAULT_TEAM = 'team_78VeGDURoofThjZNJOKEBpP5';
const DEFAULT_PROJECT = 'prj_P9hRun4B2OdGy8ACCnb0f7jNG6UA';

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

function terminalErrorStates(deployments, sha, branch) {
  return deployments.filter((d) => {
    const st = d.readyState || d.state || '';
    if (!['ERROR', 'CANCELED', 'DELETED'].includes(st)) return false;
    const meta = d.meta || {};
    if (!shaMatches(meta, sha)) return false;
    return commitRefMatches(meta, branch);
  });
}

function pickReadyDeployment(deployments, sha, branch) {
  const candidates = deployments.filter((d) => {
    const st = d.readyState || d.state || '';
    if (st !== 'READY') return false;
    const meta = d.meta || {};
    if (!shaMatches(meta, sha)) return false;
    if (!commitRefMatches(meta, branch)) return false;
    return true;
  });
  if (candidates.length === 0) return null;

  const preferNoTarget = candidates.filter((d) => d.target == null);
  if (preferNoTarget.length > 0) {
    preferNoTarget.sort((a, b) => (b.createdAt || b.created || 0) - (a.createdAt || a.created || 0));
    return preferNoTarget[0];
  }
  candidates.sort((a, b) => (b.createdAt || b.created || 0) - (a.createdAt || a.created || 0));
  return candidates[0];
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(u, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    const text = await res.text();

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function writeGithubStepOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT || '';
  if (!outputFile || !name) return;
  appendFileSync(outputFile, `${name}=${value}\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    usage();
    process.exit(0);
  }

  const token = process.env.VERCEL_TOKEN || '';
  const sha = process.env.GITHUB_SHA || process.env.VERCEL_COMMIT_SHA || '';
  const teamId = process.env.VERCEL_TEAM_ID || DEFAULT_TEAM;
  const projectId = process.env.VERCEL_PROJECT_ID || DEFAULT_PROJECT;
  const branch = process.env.VERCEL_BRANCH || 'main';
  const intervalSec = Math.max(
    5,
    Number.parseInt(process.env.VERCEL_POLL_INTERVAL_SEC || '20', 10) || 20,
  );
  const timeoutMin = Math.max(
    1,
    Number.parseInt(process.env.VERCEL_WAIT_TIMEOUT_MINUTES || '45', 10) || 45,
  );
  const fetchTimeoutMs = Math.max(
    5000,
    Number.parseInt(process.env.VERCEL_FETCH_TIMEOUT_MS || '45000', 10) || 45000,
  );

  if (!token || token.startsWith('op://')) {
    process.stderr.write(
      '::error title=wait-for-vercel-deployment::VERCEL_TOKEN missing or unresolved (still an op:// reference).\n',
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

  process.stdout.write(
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

      process.stdout.write(
        `::warning title=wait-for-vercel-deployment::Transient Vercel list failure (attempt ${attempt}): ${listed.detail}. Retrying...\n`,
      );

      if (attempt === 1 || attempt % 5 === 0) {
        process.stdout.write(
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
      writeGithubStepOutput('deployment_url', url);
      if (deploymentId) {
        writeGithubStepOutput('deployment_id', deploymentId);
      }

      process.stdout.write(`::notice::Vercel deployment READY: ${url}\n`);
      if (deploymentId) {
        process.stdout.write(`::notice::Vercel deployment id: ${deploymentId}\n`);
      }
      process.stdout.write(
        `Production release readiness will promote this deployment to equipqr.app in the next workflow step.\n`,
      );

      process.exit(0);
    }

    if (attempt === 1 || attempt % 5 === 0) {
      process.stdout.write(
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

main().catch((err) => {
  process.stderr.write(
    `::error title=wait-for-vercel-deployment::${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
