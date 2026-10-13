import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  EDGE_OPTIONAL_KEYS,
  EDGE_REQUIRED_KEYS,
  GITHUB_SECRET_EDGE_KEYS,
  collectDesired,
  readSecretEnv,
  isWeakKey,
  planEdge,
  planVercel,
  resolveGithubValue,
  run,
  sha256Hex,
} from '@/dev/ci/sync-deploy-config.mjs';

// Passes the Edge runtime entropy rules (32+ chars, varied, no weak patterns).
const STRONG = 'Zq8!vR2#pL9$wX4&mN7^tB3*cH6@yJ1%';
const STRONG_2 = 'gT5&kW9!xD2#rF7$nC4^vB8*hM1@pQ6%';

/** Mirrors how workflows pass each managed secret as SYNC_SECRET_<NAME>. */
function secretEnv(secrets: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(secrets).map(([name, value]) => [`SYNC_SECRET_${name}`, value]));
}

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
    // Preview does not touch Supabase Edge secrets unless opted in.
    expect(edge).toEqual({});
  });

  it('lists required production edge secrets that are missing', () => {
    const { missingEdge } = collectDesired({ vars: {}, secrets: {}, target: 'production' });
    expect(missingEdge).toEqual(EDGE_REQUIRED_KEYS);
  });

  it('never publishes a GitHub secret into a browser-visible VITE_ key', () => {
    const { vercel, skippedVercel } = collectDesired({
      vars: {},
      secrets: { SUPABASE_ANON_KEY: 'from-secret', PREVIEW_QUICK_LOGIN: 'true' },
      target: 'preview',
    });
    expect(vercel).toEqual({});
    expect(skippedVercel).toContain('SUPABASE_ANON_KEY');
  });

  it('syncs preview Edge secrets only when SYNC_PREVIEW_EDGE is true', () => {
    const secrets = edgeSecrets();
    expect(collectDesired({ vars: {}, secrets, target: 'preview' }).edge).toEqual({});
    const optedIn = collectDesired({ vars: { SYNC_PREVIEW_EDGE: 'true' }, secrets, target: 'preview' });
    expect(Object.keys(optedIn.edge)).toEqual(EDGE_REQUIRED_KEYS);
  });
});

describe('isWeakKey', () => {
  it('matches the Edge runtime entropy rules', () => {
    expect(isWeakKey(STRONG)).toBe(false);
    expect(isWeakKey('a'.repeat(32))).toBe(true);
    expect(isWeakKey('short')).toBe(true);
    expect(isWeakKey(`${STRONG}password`)).toBe(true);
    expect(isWeakKey(`x0123456789${STRONG}`)).toBe(true);
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

  it('ignores overrides for other branches but reports them', () => {
    const plan = planVercel({
      target: 'preview',
      branch: 'preview',
      desired: { VITE_A: '1' },
      remote: [{ id: 'a', key: 'VITE_A', target: ['preview'], gitBranch: 'feature', value: '9' }],
    });
    expect(plan.actions).toEqual([{ type: 'create', key: 'VITE_A', value: '1', target: 'preview' }]);
    expect(plan.branchOverrides).toEqual(['VITE_A@feature']);
  });

  it('keeps the managed branch override equal to the GitHub value', () => {
    const plan = planVercel({
      target: 'preview',
      branch: 'preview',
      desired: { VITE_A: 'github', VITE_B: 'same' },
      remote: [
        { id: 'a', key: 'VITE_A', target: ['preview'], value: 'github' },
        { id: 'a-br', key: 'VITE_A', target: ['preview'], gitBranch: 'preview', value: 'stale' },
        { id: 'b', key: 'VITE_B', target: ['preview'], value: 'same' },
        { id: 'b-br', key: 'VITE_B', target: ['preview'], gitBranch: 'preview', value: 'same' },
      ],
    });
    expect(plan.actions).toEqual([{ type: 'update', key: 'VITE_A@preview', id: 'a-br', value: 'github' }]);
    expect(plan.report).toContainEqual({ key: 'VITE_A@preview', status: 'DRIFT' });
    expect(plan.report).toContainEqual({ key: 'VITE_B@preview', status: 'MATCH' });
    expect(plan.branchOverrides).toEqual([]);
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
      desired: { TOKEN_ENCRYPTION_KEY: STRONG },
      remote: [{ name: 'TOKEN_ENCRYPTION_KEY', value: sha256Hex(STRONG_2) }],
    });
    expect(plan.writes).toEqual([]);
    expect(plan.errors[0]).toMatch(/TOKEN_ENCRYPTION_KEY differs/);
  });

  it('rejects placeholders and keys the Edge runtime would refuse', () => {
    const plan = planEdge({
      desired: {
        RESEND_API_KEY: 'changeme',
        KDF_SALT: 'short',
        TOKEN_ENCRYPTION_KEY: 'a'.repeat(32),
      },
      remote: [],
    });
    expect(plan.errors).toHaveLength(3);
    expect(plan.errors[2]).toMatch(/TOKEN_ENCRYPTION_KEY is too weak/);
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
        ...secretEnv(secrets),
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
    // Public client IDs are GitHub variables; Edge reads them too.
    const vars = {
      SUPABASE_PROJECT_REF: 'ref123',
      INTUIT_CLIENT_ID: secrets.INTUIT_CLIENT_ID,
    };
    delete secrets.INTUIT_CLIENT_ID;
    const { calls, fetchImpl } = fakeApi({
      [`GET /v10/projects/${project}/env`]: () => ({ envs: [] }),
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
        SYNC_VARS_JSON: JSON.stringify(vars),
        ...secretEnv(secrets),
      },
      fetchImpl,
    });
    expect(code).toBe(0);
    // Only the variable reaches Vercel; GOOGLE_WORKSPACE_CLIENT_ID is a secret here.
    const vercelWrites = calls.filter((c) => c.method === 'POST' && c.path === `/v10/projects/${project}/env`);
    expect(vercelWrites).toEqual([
      {
        method: 'POST',
        path: `/v10/projects/${project}/env`,
        body: {
          key: 'VITE_INTUIT_CLIENT_ID',
          value: vars.INTUIT_CLIENT_ID,
          type: 'encrypted',
          target: ['production'],
        },
      },
    ]);
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/v1/projects/ref123/secrets',
      body: [{ name: 'RESEND_API_KEY', value: secrets.RESEND_API_KEY }],
    });
  });

  it('preview Edge sync refuses the production Supabase project', async () => {
    const { calls, fetchImpl } = fakeApi({
      [`GET /v10/projects/${project}/env`]: () => ({ envs: [] }),
    });
    const code = await run({
      env: {
        SYNC_TARGET: 'preview',
        SYNC_MODE: 'apply',
        VERCEL_TOKEN: 't',
        SUPABASE_ACCESS_TOKEN: 's',
        SYNC_VARS_JSON: JSON.stringify({
          SYNC_PREVIEW_EDGE: 'true',
          SUPABASE_PROJECT_REF: 'ymxkzronkhwxzcdcbnwq',
        }),
        ...secretEnv(edgeSecrets()),
      },
      fetchImpl,
    });
    expect(code).toBe(1);
    expect(calls.every((c) => c.method === 'GET' && !c.path.includes('/secrets'))).toBe(true);
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
        ...secretEnv(secrets),
      },
      fetchImpl,
    });
    const printed = [...stdout.mock.calls, ...stderr.mock.calls].map((c) => String(c[0])).join('');
    for (const value of Object.values(secrets)) expect(printed).not.toContain(value);
  });
});

describe('workflow secret wiring', () => {
  const workflows = [
    '.github/workflows/sync-deploy-config.yml',
    '.github/workflows/production-release-readiness.yml',
  ];

  it('never hands a step every secret via toJSON(secrets)', () => {
    for (const file of workflows) {
      const text = readFileSync(join(process.cwd(), file), 'utf-8');
      const code = text
        .split('\n')
        .filter((line) => !line.trim().startsWith('#'))
        .join('\n');
      expect(code, file).not.toMatch(/toJSON\(\s*secrets\s*\)/);
    }
  });

  it('lists only managed Edge keys as secret-backed', () => {
    const managed = new Set([...EDGE_REQUIRED_KEYS, ...EDGE_OPTIONAL_KEYS]);
    for (const name of GITHUB_SECRET_EDGE_KEYS) expect(managed.has(name), name).toBe(true);
  });

  // Each step that runs the sync must pass exactly GITHUB_SECRET_EDGE_KEYS,
  // each under its own name, so dropping one assignment fails here.
  it.each([
    ['.github/workflows/sync-deploy-config.yml', 1],
    ['.github/workflows/production-release-readiness.yml', 2],
  ])('%s passes exactly the managed secrets in each of its %i sync step(s)', (file, stepCount) => {
    const text = readFileSync(join(process.cwd(), file), 'utf-8');
    const syncSteps = text
      .split(/\n\s*- name: /)
      .filter((step) => step.includes('node dev/ci/sync-deploy-config.mjs'));
    expect(syncSteps).toHaveLength(stepCount);
    const expected = [...GITHUB_SECRET_EDGE_KEYS].sort();
    for (const step of syncSteps) {
      const pairs = [...step.matchAll(/SYNC_SECRET_([A-Z0-9_]+): \$\{\{ secrets\.([A-Z0-9_]+) \}\}/g)];
      for (const [, envName, secretName] of pairs) expect(envName).toBe(secretName);
      expect(pairs.map(([, envName]) => envName).sort()).toEqual(expected);
    }
  });

  it('readSecretEnv ignores unrelated and empty env vars', () => {
    expect(
      readSecretEnv({
        SYNC_SECRET_RESEND_API_KEY: 'r',
        SYNC_SECRET_KDF_SALT: '',
        SYNC_SECRET_UNRELATED: 'x',
        RESEND_API_KEY: 'plain',
      }),
    ).toEqual({ RESEND_API_KEY: 'r' });
  });
});
