import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  EDGE_REQUIRED_KEYS,
  collectDesired,
  planEdge,
  planVercel,
  resolveGithubValue,
  run,
  sha256Hex,
} from '@/dev/ci/sync-deploy-config.mjs';

const STRONG = 'k'.repeat(16) + 'Zq8!vR2#pL9$wX4&';

function edgeSecrets(): Record<string, string> {
  return Object.fromEntries(EDGE_REQUIRED_KEYS.map((name) => [name, `${name}-${STRONG}`]));
}

describe('resolveGithubValue', () => {
  it('prefers variables, falls back to secrets, and ignores blanks', () => {
    expect(resolveGithubValue('A', { A: 'var' }, { A: 'secret' })).toBe('var');
    expect(resolveGithubValue('A', { A: '  ' }, { A: 'secret' })).toBe('secret');
    expect(resolveGithubValue('A', {}, {})).toBeUndefined();
  });
});

describe('collectDesired', () => {
  it('maps public names to VITE_ keys and reports names GitHub does not define', () => {
    const { vercel, skippedVercel, edge } = collectDesired({
      vars: { CLARITY_PROJECT_ID: 'abc', SUPABASE_URL: 'https://x.supabase.co' },
      secrets: {},
      target: 'preview',
    });
    expect(vercel).toEqual({
      VITE_SUPABASE_URL: 'https://x.supabase.co',
      VITE_CLARITY_PROJECT_ID: 'abc',
    });
    expect(skippedVercel).toContain('HCAPTCHA_SITEKEY');
    // Preview never touches Supabase Edge secrets.
    expect(edge).toEqual({});
  });

  it('lists required production edge secrets that are missing', () => {
    const { missingEdge } = collectDesired({ vars: {}, secrets: {}, target: 'production' });
    expect(missingEdge).toEqual(EDGE_REQUIRED_KEYS);
  });
});

describe('planVercel', () => {
  it('creates missing keys, updates drifted ones, and leaves matches alone', () => {
    const plan = planVercel({
      target: 'preview',
      desired: { VITE_A: '1', VITE_B: '2', VITE_C: '3' },
      remote: [
        { id: 'a', key: 'VITE_A', target: ['preview'], value: '1' },
        { id: 'b', key: 'VITE_B', target: ['preview'], value: 'old' },
        { id: 'x', key: 'VITE_LEGACY', target: ['preview'], value: 'z' },
      ],
    });
    expect(plan.actions).toEqual([
      { type: 'update', key: 'VITE_B', id: 'b', value: '2' },
      { type: 'create', key: 'VITE_C', value: '3', target: 'preview' },
    ]);
    expect(plan.report).toEqual([
      { key: 'VITE_A', status: 'MATCH' },
      { key: 'VITE_B', status: 'DRIFT' },
      { key: 'VITE_C', status: 'MISSING' },
    ]);
    expect(plan.unmanaged).toEqual(['VITE_LEGACY']);
  });

  it('splits a record shared with production instead of changing both targets', () => {
    const plan = planVercel({
      target: 'preview',
      desired: { VITE_A: 'preview-value' },
      remote: [{ id: 'a', key: 'VITE_A', target: ['preview', 'production'], value: 'prod-value' }],
    });
    expect(plan.actions).toEqual([
      { type: 'retarget', key: 'VITE_A', id: 'a', target: ['production'] },
      { type: 'create', key: 'VITE_A', value: 'preview-value', target: 'preview' },
    ]);
  });

  it('ignores branch-specific records but reports them', () => {
    const plan = planVercel({
      target: 'preview',
      desired: { VITE_A: '1' },
      remote: [{ id: 'a', key: 'VITE_A', target: ['preview'], gitBranch: 'feature', value: '9' }],
    });
    expect(plan.actions).toEqual([{ type: 'create', key: 'VITE_A', value: '1', target: 'preview' }]);
    expect(plan.branchOverrides).toEqual(['VITE_A@feature']);
  });
});

describe('planEdge', () => {
  it('writes only missing or drifted secrets, compared by digest', () => {
    const plan = planEdge({
      desired: { RESEND_API_KEY: 'same', HCAPTCHA_SECRET_KEY: 'new' },
      remote: [
        { name: 'RESEND_API_KEY', value: sha256Hex('same') },
        { name: 'HCAPTCHA_SECRET_KEY', value: sha256Hex('old') },
      ],
    });
    expect(plan.errors).toEqual([]);
    expect(plan.writes).toEqual([{ name: 'HCAPTCHA_SECRET_KEY', value: 'new' }]);
  });

  it('refuses to overwrite an existing encryption key or salt', () => {
    const plan = planEdge({
      desired: { TOKEN_ENCRYPTION_KEY: STRONG + STRONG },
      remote: [{ name: 'TOKEN_ENCRYPTION_KEY', value: sha256Hex('live-key') }],
    });
    expect(plan.writes).toEqual([]);
    expect(plan.errors[0]).toMatch(/TOKEN_ENCRYPTION_KEY differs/);
  });

  it('rejects placeholders and short encryption keys', () => {
    const plan = planEdge({ desired: { RESEND_API_KEY: 'changeme', KDF_SALT: 'short' }, remote: [] });
    expect(plan.errors).toHaveLength(2);
    expect(plan.writes).toEqual([]);
  });
});

type Call = { method: string; path: string; body?: unknown };

function fakeApi(handlers: Record<string, (body?: unknown) => unknown>) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
    const method = init?.method || 'GET';
    const path = new URL(url).pathname;
    const body = init?.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body });
    const handler = handlers[`${method} ${path}`];
    if (!handler) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(handler(body) ?? {}), { status: 200 });
  });
  return { calls, fetchImpl };
}

describe('run', () => {
  let stdout: ReturnType<typeof vi.spyOn>;
  let stderr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  });

  afterEach(() => {
    stdout.mockRestore();
    stderr.mockRestore();
  });

  const project = 'prj_P9hRun4B2OdGy8ACCnb0f7jNG6UA';

  it('check mode reports drift without writing', async () => {
    const { calls, fetchImpl } = fakeApi({
      [`GET /v10/projects/${project}/env`]: () => ({ envs: [] }),
    });
    const code = await run({
      env: {
        SYNC_TARGET: 'preview',
        SYNC_MODE: 'check',
        VERCEL_TOKEN: 't',
        SYNC_VARS_JSON: JSON.stringify({ CLARITY_PROJECT_ID: 'abc' }),
      },
      fetchImpl,
    });
    expect(code).toBe(1);
    expect(calls.every((c) => c.method === 'GET')).toBe(true);
  });

  it('apply mode writes Vercel values and redeploys the branch', async () => {
    const { calls, fetchImpl } = fakeApi({
      [`GET /v10/projects/${project}/env`]: () => ({ envs: [] }),
      [`POST /v10/projects/${project}/env`]: () => ({}),
      'GET /v6/deployments': () => ({
        deployments: [
          { uid: 'dpl_old', name: 'equipqr', createdAt: 1, meta: { githubCommitRef: 'preview' } },
          { uid: 'dpl_new', name: 'equipqr', createdAt: 2, meta: { githubCommitRef: 'preview' } },
          { uid: 'dpl_pr', name: 'equipqr', createdAt: 3, meta: { githubCommitRef: 'feat/x' } },
        ],
      }),
      'POST /v13/deployments': () => ({ url: 'equipqr-redeploy.vercel.app' }),
    });
    const code = await run({
      env: {
        SYNC_TARGET: 'preview',
        SYNC_MODE: 'apply',
        VERCEL_TOKEN: 't',
        SYNC_REDEPLOY_BRANCH: 'preview',
        SYNC_VARS_JSON: JSON.stringify({ CLARITY_PROJECT_ID: 'abc' }),
      },
      fetchImpl,
    });
    expect(code).toBe(0);
    expect(calls).toContainEqual({
      method: 'POST',
      path: `/v10/projects/${project}/env`,
      body: { key: 'VITE_CLARITY_PROJECT_ID', value: 'abc', type: 'encrypted', target: ['preview'] },
    });
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/v13/deployments',
      body: { name: 'equipqr', deploymentId: 'dpl_new' },
    });
  });

  it('production fails before any write when a required secret is missing', async () => {
    const secrets = edgeSecrets();
    delete secrets.RESEND_API_KEY;
    const { calls, fetchImpl } = fakeApi({
      [`GET /v10/projects/${project}/env`]: () => ({ envs: [] }),
      'GET /v1/projects/ref123/secrets': () => [],
    });
    const code = await run({
      env: {
        SYNC_TARGET: 'production',
        SYNC_MODE: 'apply',
        VERCEL_TOKEN: 't',
        SUPABASE_ACCESS_TOKEN: 's',
        SYNC_VARS_JSON: JSON.stringify({ SUPABASE_PROJECT_REF: 'ref123', CLARITY_PROJECT_ID: 'abc' }),
        SYNC_SECRETS_JSON: JSON.stringify(secrets),
      },
      fetchImpl,
    });
    expect(code).toBe(1);
    expect(calls.every((c) => c.method === 'GET')).toBe(true);
  });

  it('production apply sends only changed edge secrets to Supabase', async () => {
    const secrets = edgeSecrets();
    const remote = Object.entries(secrets).map(([name, value]) => ({ name, value: sha256Hex(value) }));
    secrets.RESEND_API_KEY = `rotated-${STRONG}`;
    const { calls, fetchImpl } = fakeApi({
      [`GET /v10/projects/${project}/env`]: () => ({ envs: [] }),
      // INTUIT_CLIENT_ID / GOOGLE_WORKSPACE_CLIENT_ID are also public VITE_ keys.
      [`POST /v10/projects/${project}/env`]: () => ({}),
      'GET /v1/projects/ref123/secrets': () => remote,
      'POST /v1/projects/ref123/secrets': () => ({}),
    });
    const code = await run({
      env: {
        SYNC_TARGET: 'production',
        SYNC_MODE: 'apply',
        VERCEL_TOKEN: 't',
        SUPABASE_ACCESS_TOKEN: 's',
        SYNC_VARS_JSON: JSON.stringify({ SUPABASE_PROJECT_REF: 'ref123' }),
        SYNC_SECRETS_JSON: JSON.stringify(secrets),
      },
      fetchImpl,
    });
    expect(code).toBe(0);
    expect(calls).toContainEqual({
      method: 'POST',
      path: `/v10/projects/${project}/env`,
      body: {
        key: 'VITE_INTUIT_CLIENT_ID',
        value: secrets.INTUIT_CLIENT_ID,
        type: 'encrypted',
        target: ['production'],
      },
    });
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/v1/projects/ref123/secrets',
      body: [{ name: 'RESEND_API_KEY', value: secrets.RESEND_API_KEY }],
    });
  });

  it('never prints secret values', async () => {
    const secrets = edgeSecrets();
    const { fetchImpl } = fakeApi({
      [`GET /v10/projects/${project}/env`]: () => ({ envs: [] }),
      'GET /v1/projects/ref123/secrets': () => [],
    });
    await run({
      env: {
        SYNC_TARGET: 'production',
        SYNC_MODE: 'check',
        VERCEL_TOKEN: 't',
        SUPABASE_ACCESS_TOKEN: 's',
        SYNC_VARS_JSON: JSON.stringify({ SUPABASE_PROJECT_REF: 'ref123' }),
        SYNC_SECRETS_JSON: JSON.stringify(secrets),
      },
      fetchImpl,
    });
    const printed = [...stdout.mock.calls, ...stderr.mock.calls].map((c) => String(c[0])).join('');
    for (const value of Object.values(secrets)) expect(printed).not.toContain(value);
  });
});
