import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  evaluateProductionDeployment,
  pickProductionDeployment,
  verifyProductionDeployment,
} from '@/dev/release/promote-vercel-production.mjs';

const CURRENT_SHA = '74caa4bab501458e80117b7eef0a91ed4f79552e';
const PREVIOUS_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

type DeploymentFixture = Record<string, unknown> & {
  uid: string;
  url: string;
  createdAt: number;
  target: string | null;
  readyState: string;
  meta: Record<string, unknown> & {
    githubCommitSha: string;
    githubCommitRef: string;
  };
};

function makeDeployment(overrides: Record<string, unknown> = {}): DeploymentFixture {
  const metaOverrides =
    overrides.meta && typeof overrides.meta === 'object' ? (overrides.meta as Record<string, unknown>) : {};

  return {
    uid: 'dpl_default',
    url: 'equipqr-default.vercel.app',
    createdAt: 100,
    target: 'production',
    readyState: 'READY',
    meta: {
      githubCommitSha: CURRENT_SHA,
      githubCommitRef: 'main',
      ...metaOverrides,
    },
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('pickProductionDeployment', () => {
  it('prefers the newest production deployment on the requested branch', () => {
    const previewCandidate = makeDeployment({
      uid: 'dpl_preview',
      target: null,
      createdAt: 300,
    });
    const otherBranchProduction = makeDeployment({
      uid: 'dpl_other_branch',
      createdAt: 200,
      meta: { githubCommitSha: PREVIOUS_SHA, githubCommitRef: 'release/hotfix' },
    });
    const currentProduction = makeDeployment({
      uid: 'dpl_current',
      createdAt: 250,
    });

    expect(
      pickProductionDeployment([previewCandidate, otherBranchProduction, currentProduction], 'main'),
    ).toMatchObject({ uid: 'dpl_current' });
  });
});

describe('evaluateProductionDeployment', () => {
  it('passes when the current production deployment already matches the requested sha', () => {
    const result = evaluateProductionDeployment({
      deployment: makeDeployment({ uid: 'dpl_current' }),
      sha: CURRENT_SHA,
    });

    expect(result).toEqual({ ok: true, detail: '' });
  });

  it('fails when the current production deployment points at the wrong sha', () => {
    const result = evaluateProductionDeployment({
      deployment: makeDeployment({
        uid: 'dpl_old',
        meta: { githubCommitSha: PREVIOUS_SHA, githubCommitRef: 'main' },
      }),
      sha: CURRENT_SHA,
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toContain('commit mismatch');
    expect(result.detail).toContain(CURRENT_SHA.slice(0, 7));
    expect(result.detail).toContain(PREVIOUS_SHA.slice(0, 7));
  });

  it('fails when the production deployment is not ready yet', () => {
    const result = evaluateProductionDeployment({
      deployment: makeDeployment({
        uid: 'dpl_building',
        readyState: 'BUILDING',
      }),
      sha: CURRENT_SHA,
    });

    expect(result.ok).toBe(false);
    expect(result.detail).toContain('not READY');
  });
});

describe('verifyProductionDeployment', () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('verifies the production deployment discovered from the project instead of the pre-promote deployment id', async () => {
    const oldProduction = makeDeployment({
      uid: 'dpl_old',
      createdAt: 100,
      meta: { githubCommitSha: PREVIOUS_SHA, githubCommitRef: 'main' },
    });
    const promotedProduction = makeDeployment({
      uid: 'dpl_promoted',
      url: 'equipqr-promoted.vercel.app',
      createdAt: 200,
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ deployments: [oldProduction] }))
      .mockResolvedValueOnce(jsonResponse({ deployments: [oldProduction, promotedProduction] }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      verifyProductionDeployment({
        token: 'vercel-token',
        teamId: 'team_123',
        projectId: 'prj_123',
        branch: 'main',
        sha: CURRENT_SHA,
        verifyTimeoutMs: 100,
        fetchTimeoutMs: 100,
        pollIntervalMs: 0,
      }),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestUrl.pathname).toBe('/v7/deployments');
    expect(requestUrl.searchParams.get('target')).toBe('production');
    expect(requestUrl.searchParams.get('projectId')).toBe('prj_123');
    expect(requestUrl.searchParams.get('teamId')).toBe('team_123');
    expect(requestUrl.searchParams.get('branch')).toBeNull();
  });
});
