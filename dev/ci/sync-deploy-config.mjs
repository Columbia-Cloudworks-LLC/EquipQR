#!/usr/bin/env node
/**
 * Sync deployment configuration from a GitHub Environment to Vercel and Supabase.
 *
 * GitHub Environments (`preview`, `production`) are the only source of truth:
 * public values are environment variables, secrets are environment secrets.
 * This script is the only writer of Vercel env vars and Supabase Edge secrets.
 *
 * - Vercel: `VITE_<NAME>` for every NAME in VERCEL_PUBLIC_KEYS that GitHub defines
 *   (variable first, then secret). Keys missing in GitHub are skipped, never deleted.
 * - Supabase (production only): every NAME in EDGE_REQUIRED_KEYS / EDGE_OPTIONAL_KEYS.
 *   IMMUTABLE_EDGE_KEYS are never overwritten once set; rotating them needs a
 *   re-encryption plan, so a mismatch fails the run before any write.
 *
 * Nothing is written until every check passes. Output lists names and statuses only.
 *
 * Env:
 *   SYNC_TARGET            preview | production (required)
 *   SYNC_MODE              check | apply (default check; check exits 1 on drift)
 *   SYNC_VARS_JSON         ${{ toJSON(vars) }}
 *   SYNC_SECRETS_JSON      ${{ toJSON(secrets) }}
 *   VERCEL_TOKEN           required
 *   VERCEL_TEAM_ID / VERCEL_PROJECT_ID  optional overrides
 *   SUPABASE_ACCESS_TOKEN  required when SYNC_TARGET=production
 *   SUPABASE_PROJECT_REF   default from SYNC_VARS_JSON.SUPABASE_PROJECT_REF
 *   SYNC_REDEPLOY_BRANCH   apply only: redeploy the newest deployment of this git
 *                          branch when Vercel values changed (preview uses `preview`)
 */

import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const DEFAULT_TEAM = 'team_78VeGDURoofThjZNJOKEBpP5';
const DEFAULT_PROJECT = 'prj_P9hRun4B2OdGy8ACCnb0f7jNG6UA';
const VERCEL_API = 'https://api.vercel.com';
const SUPABASE_API = 'https://api.supabase.com';

/** Browser-visible values. Vercel key is `VITE_` + name. */
export const VERCEL_PUBLIC_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'HCAPTCHA_SITEKEY',
  'INTUIT_CLIENT_ID',
  'GOOGLE_WORKSPACE_CLIENT_ID',
  'GW_OAUTH_REDIRECT_BASE_URL',
  'QB_OAUTH_REDIRECT_BASE_URL',
  'CLARITY_PROJECT_ID',
  'DOCUMENTATION_URL',
  'ENABLE_MFA',
  'ENABLE_OFFLINE_QUEUE',
  'PREVIEW_QUICK_LOGIN',
  'DEV_TEST_PASSWORD',
];

export const EDGE_REQUIRED_KEYS = [
  'RESEND_API_KEY',
  'HCAPTCHA_SECRET_KEY',
  'TOKEN_ENCRYPTION_KEY',
  'KDF_SALT',
  'INTUIT_CLIENT_ID',
  'INTUIT_CLIENT_SECRET',
  'GOOGLE_WORKSPACE_CLIENT_ID',
  'GOOGLE_WORKSPACE_CLIENT_SECRET',
  'GOOGLE_MAPS_SERVER_KEY',
  'GOOGLE_MAPS_BROWSER_KEY',
  'GOOGLE_MAPS_MAP_ID',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
  'PUBLIC_SITE_URL',
];

export const EDGE_OPTIONAL_KEYS = [
  'GITHUB_PAT',
  'GITHUB_WEBHOOK_SECRET',
  'PRODUCTION_URL',
  'SUPER_ADMIN_ORG_ID',
  'GW_OAUTH_REDIRECT_BASE_URL',
  'QB_OAUTH_REDIRECT_BASE_URL',
];

/** Encrypt stored integration tokens; changing them strands existing ciphertext. */
export const IMMUTABLE_EDGE_KEYS = ['TOKEN_ENCRYPTION_KEY', 'KDF_SALT'];

const PLACEHOLDER = /^\s*$|^(test|placeholder|todo|tbd|changeme|replace-me|dummy|none|null)$/i;

function parseJsonObject(raw, label) {
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed;
}

/** Variable wins over secret; empty strings count as unset. */
export function resolveGithubValue(name, vars, secrets) {
  for (const source of [vars, secrets]) {
    const value = source[name];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return undefined;
}

export function sha256Hex(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function normalizeDigest(remote) {
  return String(remote ?? '').toLowerCase().replace(/^sha256:/, '');
}

/**
 * Decide Vercel changes for one target.
 * @param {object} p
 * @param {Record<string,string>} p.desired  VITE_ key -> value
 * @param {Array<{id:string,key:string,target:string[],gitBranch?:string|null,value?:string|null}>} p.remote
 *   Remote env records (value present when readable).
 * @param {string} p.target  preview | production
 */
export function planVercel({ desired, remote, target }) {
  const actions = [];
  const report = [];
  const shared = remote.filter((env) => !env.gitBranch && (env.target || []).includes(target));

  for (const [key, value] of Object.entries(desired)) {
    const current = shared.find((env) => env.key === key);
    if (!current) {
      actions.push({ type: 'create', key, value, target });
      report.push({ key, status: 'MISSING' });
      continue;
    }
    if (typeof current.value === 'string' && current.value === value) {
      report.push({ key, status: 'MATCH' });
      continue;
    }
    const status = typeof current.value === 'string' ? 'DRIFT' : 'UNVERIFIABLE';
    const otherTargets = (current.target || []).filter((t) => t !== target);
    if (otherTargets.length > 0) {
      // Record is shared with another target — split it so this sync never
      // changes the other environment's value.
      actions.push({ type: 'retarget', key, id: current.id, target: otherTargets });
      actions.push({ type: 'create', key, value, target });
    } else {
      actions.push({ type: 'update', key, id: current.id, value });
    }
    report.push({ key, status });
  }

  const managed = new Set(Object.keys(desired));
  const unmanaged = [
    ...new Set(shared.filter((env) => !managed.has(env.key)).map((env) => env.key)),
  ].sort();
  const branchOverrides = [
    ...new Set(
      remote
        .filter((env) => env.gitBranch && managed.has(env.key) && (env.target || []).includes(target))
        .map((env) => `${env.key}@${env.gitBranch}`),
    ),
  ].sort();

  return { actions, report, unmanaged, branchOverrides };
}

/**
 * Decide Supabase Edge secret changes.
 * @param {object} p
 * @param {Record<string,string>} p.desired  name -> value
 * @param {Array<{name:string,value?:string,digest?:string}>} p.remote  digests from the API
 */
export function planEdge({ desired, remote }) {
  const errors = [];
  const report = [];
  const writes = [];
  for (const [name, value] of Object.entries(desired)) {
    if (PLACEHOLDER.test(value)) {
      errors.push(`${name} looks like a placeholder.`);
      continue;
    }
    if (IMMUTABLE_EDGE_KEYS.includes(name) && Buffer.byteLength(value, 'utf8') < 32) {
      errors.push(`${name} must be at least 32 bytes.`);
      continue;
    }
    const current = remote.find((secret) => secret.name === name);
    const remoteDigest = current ? normalizeDigest(current.digest ?? current.value) : '';
    if (current && remoteDigest === sha256Hex(value)) {
      report.push({ key: name, status: 'MATCH' });
      continue;
    }
    if (current && IMMUTABLE_EDGE_KEYS.includes(name)) {
      errors.push(
        `${name} differs from the live Supabase value and is never overwritten automatically. ` +
          'Make the GitHub secret match production, or plan a re-encryption before rotating it.',
      );
      continue;
    }
    writes.push({ name, value });
    report.push({ key: name, status: current ? 'DRIFT' : 'MISSING' });
  }
  return { errors, report, writes };
}

export function collectDesired({ vars, secrets, target }) {
  const vercel = {};
  const skippedVercel = [];
  for (const name of VERCEL_PUBLIC_KEYS) {
    const value = resolveGithubValue(name, vars, secrets);
    if (value === undefined) skippedVercel.push(name);
    else vercel[`VITE_${name}`] = value;
  }

  const edge = {};
  const missingEdge = [];
  if (target === 'production') {
    for (const name of [...EDGE_REQUIRED_KEYS, ...EDGE_OPTIONAL_KEYS]) {
      const value = resolveGithubValue(name, vars, secrets);
      if (value !== undefined) edge[name] = value;
      else if (EDGE_REQUIRED_KEYS.includes(name)) missingEdge.push(name);
    }
  }
  return { vercel, skippedVercel, edge, missingEdge };
}

async function http(fetchImpl, url, { method = 'GET', token, body } = {}) {
  const res = await fetchImpl(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    // Response bodies can echo request fields; report status only.
    throw new Error(`${method} ${new URL(url).pathname} failed with HTTP ${res.status}.`);
  }
  return text ? JSON.parse(text) : null;
}

function vercelUrl(path, teamId, params = {}) {
  const u = new URL(path, VERCEL_API);
  u.searchParams.set('teamId', teamId);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

async function readVercelEnv({ fetchImpl, token, teamId, projectId, target }) {
  const list = await http(fetchImpl, vercelUrl(`/v10/projects/${projectId}/env`, teamId), { token });
  const envs = Array.isArray(list?.envs) ? list.envs : [];
  const relevant = envs.filter((env) => (env.target || []).includes(target));
  // The list endpoint does not return decrypted values; read each relevant record.
  for (const env of relevant) {
    if (env.type === 'sensitive') continue;
    const detail = await http(
      fetchImpl,
      vercelUrl(`/v1/projects/${projectId}/env/${env.id}`, teamId),
      { token },
    );
    if (typeof detail?.value === 'string') env.value = detail.value;
  }
  return relevant;
}

async function applyVercel({ fetchImpl, token, teamId, projectId, actions }) {
  for (const action of actions) {
    if (action.type === 'create') {
      await http(fetchImpl, vercelUrl(`/v10/projects/${projectId}/env`, teamId), {
        method: 'POST',
        token,
        body: { key: action.key, value: action.value, type: 'encrypted', target: [action.target] },
      });
    } else if (action.type === 'update') {
      await http(fetchImpl, vercelUrl(`/v9/projects/${projectId}/env/${action.id}`, teamId), {
        method: 'PATCH',
        token,
        body: { value: action.value },
      });
    } else if (action.type === 'retarget') {
      await http(fetchImpl, vercelUrl(`/v9/projects/${projectId}/env/${action.id}`, teamId), {
        method: 'PATCH',
        token,
        body: { target: action.target },
      });
    }
  }
}

async function redeployBranch({ fetchImpl, token, teamId, projectId, branch }) {
  const list = await http(
    fetchImpl,
    vercelUrl('/v6/deployments', teamId, { projectId, limit: '20', target: 'preview' }),
    { token },
  );
  const latest = (list?.deployments || [])
    .filter((d) => {
      const ref = d.meta?.githubCommitRef || '';
      return ref === branch || ref === `refs/heads/${branch}`;
    })
    .sort((a, b) => (b.createdAt || b.created || 0) - (a.createdAt || a.created || 0))[0];
  if (!latest) return null;
  const created = await http(fetchImpl, vercelUrl('/v13/deployments', teamId), {
    method: 'POST',
    token,
    // No target: the redeploy keeps the original (preview) target and git metadata.
    body: { name: latest.name, deploymentId: latest.uid },
  });
  return created?.url || created?.id || 'requested';
}

function printReport(title, rows) {
  if (rows.length === 0) return;
  process.stdout.write(`${title}\n`);
  for (const { key, status } of rows) process.stdout.write(`  ${key}: ${status}\n`);
}

export async function run({ env = process.env, fetchImpl = fetch } = {}) {
  const target = env.SYNC_TARGET;
  const mode = env.SYNC_MODE || 'check';
  if (target !== 'preview' && target !== 'production') {
    throw new Error('SYNC_TARGET must be preview or production.');
  }
  if (mode !== 'check' && mode !== 'apply') throw new Error('SYNC_MODE must be check or apply.');

  const vars = parseJsonObject(env.SYNC_VARS_JSON, 'SYNC_VARS_JSON');
  const secrets = parseJsonObject(env.SYNC_SECRETS_JSON, 'SYNC_SECRETS_JSON');
  const vercelToken = env.VERCEL_TOKEN || '';
  if (!vercelToken) throw new Error('VERCEL_TOKEN is required.');
  const teamId = env.VERCEL_TEAM_ID || DEFAULT_TEAM;
  const projectId = env.VERCEL_PROJECT_ID || DEFAULT_PROJECT;

  const { vercel, skippedVercel, edge, missingEdge } = collectDesired({ vars, secrets, target });
  const errors = missingEdge.map((name) => `Required ${target} secret ${name} is not set in GitHub.`);

  // Plan everything before writing anything.
  const remoteVercel = await readVercelEnv({ fetchImpl, token: vercelToken, teamId, projectId, target });
  const vercelPlan = planVercel({ desired: vercel, remote: remoteVercel, target });

  let edgePlan = { errors: [], report: [], writes: [] };
  let supabaseToken = '';
  let projectRef = '';
  if (target === 'production') {
    supabaseToken = env.SUPABASE_ACCESS_TOKEN || '';
    projectRef = env.SUPABASE_PROJECT_REF || resolveGithubValue('SUPABASE_PROJECT_REF', vars, secrets) || '';
    if (!supabaseToken) errors.push('SUPABASE_ACCESS_TOKEN is required for production.');
    if (!projectRef) errors.push('SUPABASE_PROJECT_REF is required for production.');
    if (supabaseToken && projectRef) {
      const remoteSecrets = await http(
        fetchImpl,
        `${SUPABASE_API}/v1/projects/${projectRef}/secrets`,
        { token: supabaseToken },
      );
      edgePlan = planEdge({ desired: edge, remote: Array.isArray(remoteSecrets) ? remoteSecrets : [] });
      errors.push(...edgePlan.errors);
    }
  }

  process.stdout.write(`Deployment configuration (${target}, ${mode})\n`);
  printReport('Vercel', vercelPlan.report);
  if (skippedVercel.length > 0) {
    process.stdout.write(`  Not defined in GitHub (left untouched): ${skippedVercel.map((k) => `VITE_${k}`).join(', ')}\n`);
  }
  if (vercelPlan.unmanaged.length > 0) {
    process.stdout.write(`  In Vercel but not managed from GitHub: ${vercelPlan.unmanaged.join(', ')}\n`);
  }
  if (vercelPlan.branchOverrides.length > 0) {
    process.stdout.write(`  Branch-specific overrides (not synced): ${vercelPlan.branchOverrides.join(', ')}\n`);
  }
  printReport(`Supabase Edge secrets (${projectRef || 'n/a'})`, edgePlan.report);

  if (errors.length > 0) {
    for (const error of errors) process.stderr.write(`::error title=sync-deploy-config::${error}\n`);
    return 1;
  }

  const drift = vercelPlan.actions.length > 0 || edgePlan.writes.length > 0;
  if (mode === 'check') {
    process.stdout.write(drift ? 'Drift detected. Run with SYNC_MODE=apply to fix.\n' : 'No drift.\n');
    return drift ? 1 : 0;
  }

  await applyVercel({ fetchImpl, token: vercelToken, teamId, projectId, actions: vercelPlan.actions });
  if (edgePlan.writes.length > 0) {
    await http(fetchImpl, `${SUPABASE_API}/v1/projects/${projectRef}/secrets`, {
      method: 'POST',
      token: supabaseToken,
      body: edgePlan.writes,
    });
  }
  process.stdout.write(
    `Applied ${vercelPlan.report.filter((r) => r.status !== 'MATCH').length} Vercel and ${edgePlan.writes.length} Supabase change(s).\n`,
  );

  const branch = env.SYNC_REDEPLOY_BRANCH || '';
  if (branch && vercelPlan.actions.length > 0) {
    const redeployed = await redeployBranch({ fetchImpl, token: vercelToken, teamId, projectId, branch });
    process.stdout.write(
      redeployed
        ? `Redeploy of ${branch} requested so the build picks up the new values.\n`
        : `::warning::No ${branch} deployment found to redeploy; the next push will pick up the values.\n`,
    );
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(
        `::error title=sync-deploy-config::${err instanceof Error ? err.message : String(err)}\n`,
      );
      process.exit(1);
    },
  );
}
