import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  canSyncGoogleWorkspaceDirectory,
  evaluateGoogleWorkspaceConnectionHealth,
  generateGoogleWorkspaceAuthUrl,
  GOOGLE_EXPORT_CONSENT_SCOPES,
  GOOGLE_WORKSPACE_DIRECTORY_CONSENT_SCOPES,
  GOOGLE_WORKSPACE_FEATURE_SCOPES,
  hasAllGoogleScopes,
} from './auth';

const rpcMock = vi.fn();

function parseScopeSet(url: string): Set<string> {
  const scope = new URL(url).searchParams.get('scope') ?? '';
  return new Set(scope.split(/\s+/).filter(Boolean));
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

describe('generateGoogleWorkspaceAuthUrl', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    vi.stubEnv('VITE_GOOGLE_WORKSPACE_CLIENT_ID', 'test-client');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.test');
  });

  it('builds a directory-first Google OAuth URL with a session-backed state', async () => {
    rpcMock.mockResolvedValue({
      data: [{ session_token: 'session-token', nonce: 'nonce-token' }],
      error: null,
    });

    const url = await generateGoogleWorkspaceAuthUrl({
      organizationId: 'org-123',
      redirectUrl: '/dashboard/onboarding/workspace',
    });

    const parsed = new URL(url);
    const state = parsed.searchParams.get('state');
    expect(state).toBeTruthy();

    const decoded = JSON.parse(atob(state!));
    expect(decoded.sessionToken).toBe('session-token');
    expect(decoded.nonce).toBe('nonce-token');
    expect(typeof decoded.timestamp).toBe('number');

    expect(rpcMock).toHaveBeenCalledWith('create_google_workspace_oauth_session', {
      p_organization_id: 'org-123',
      p_redirect_url: '/dashboard/onboarding/workspace',
      p_origin_url: expect.any(String),
    });

    const scopeSet = parseScopeSet(url);
    expect(scopeSet).toEqual(new Set(GOOGLE_WORKSPACE_DIRECTORY_CONSENT_SCOPES));
    expect(scopeSet).not.toContain('https://www.googleapis.com/auth/spreadsheets');
    expect(scopeSet).not.toContain('https://www.googleapis.com/auth/drive.file');
    expect(scopeSet).not.toContain('https://www.googleapis.com/auth/drive.readonly');
    expect(scopeSet).not.toContain('https://www.googleapis.com/auth/documents');
    expect(parsed.searchParams.get('access_type')).toBe('offline');
    expect(parsed.searchParams.get('prompt')).toBe('consent');
    expect(parsed.searchParams.get('include_granted_scopes')).toBe('true');
  });

  it('builds an export-consent OAuth URL with export scopes requested incrementally', async () => {
    rpcMock.mockResolvedValue({
      data: [{ session_token: 'session-token', nonce: 'nonce-token' }],
      error: null,
    });

    const url = await generateGoogleWorkspaceAuthUrl({
      organizationId: 'org-123',
      consentMode: 'export',
    });

    const parsed = new URL(url);
    expect(parseScopeSet(url)).toEqual(new Set(GOOGLE_EXPORT_CONSENT_SCOPES));
    expect(parsed.searchParams.get('include_granted_scopes')).toBe('true');
    expect(parsed.searchParams.get('access_type')).toBe('offline');
    expect(parsed.searchParams.get('prompt')).toBe('consent');
    expect(parsed.searchParams.get('include_granted_scopes')).toBe('true');
  });

  it('derives redirect_uri from VITE_SUPABASE_URL when override is unset', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://olsdirkvvfegvclbpgrg.supabase.co');
    vi.stubEnv('VITE_GW_OAUTH_REDIRECT_BASE_URL', '');
    rpcMock.mockResolvedValue({
      data: [{ session_token: 'session-token', nonce: 'nonce-token' }],
      error: null,
    });

    const url = await generateGoogleWorkspaceAuthUrl({
      organizationId: 'org-123',
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'https://supabase.equipqr.app/functions/v1/google-workspace-oauth-callback',
    );
  });

  it('normalizes the retired preview Supabase redirect host', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://olsdirkvvfegvclbpgrg.supabase.co');
    vi.stubEnv('VITE_GW_OAUTH_REDIRECT_BASE_URL', 'https://supabase.preview.equipqr.app');
    rpcMock.mockResolvedValue({
      data: [{ session_token: 'session-token', nonce: 'nonce-token' }],
      error: null,
    });

    const url = await generateGoogleWorkspaceAuthUrl({
      organizationId: 'org-123',
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'https://supabase.equipqr.app/functions/v1/google-workspace-oauth-callback',
    );
  });
});

describe('evaluateGoogleWorkspaceConnectionHealth', () => {
  const fullFeatureScopes = GOOGLE_WORKSPACE_FEATURE_SCOPES.join(' ');

  it('returns disconnected when not connected', () => {
    expect(evaluateGoogleWorkspaceConnectionHealth({ is_connected: false, scopes: null })).toBe(
      'disconnected',
    );
    expect(evaluateGoogleWorkspaceConnectionHealth(null)).toBe('disconnected');
  });

  it('returns healthy when all feature scopes are granted', () => {
    expect(
      evaluateGoogleWorkspaceConnectionHealth({ is_connected: true, scopes: fullFeatureScopes }),
    ).toBe('healthy');
    expect(hasAllGoogleScopes(fullFeatureScopes, GOOGLE_WORKSPACE_FEATURE_SCOPES)).toBe(true);
  });

  it('returns healthy when identity scopes are omitted from stored scope string', () => {
    expect(
      evaluateGoogleWorkspaceConnectionHealth({ is_connected: true, scopes: fullFeatureScopes }),
    ).toBe('healthy');
  });

  it('returns missing_permissions when connected but feature scopes are incomplete', () => {
    expect(
      evaluateGoogleWorkspaceConnectionHealth({
        is_connected: true,
        scopes: 'https://www.googleapis.com/auth/admin.directory.user.readonly',
      }),
    ).toBe('missing_permissions');
  });

  it('requests identity and directory scopes in the default OAuth URL', async () => {
    rpcMock.mockResolvedValue({
      data: [{ session_token: 'session-token', nonce: 'nonce-token' }],
      error: null,
    });

    const url = await generateGoogleWorkspaceAuthUrl({ organizationId: 'org-123' });

    expect(parseScopeSet(url)).toEqual(new Set(GOOGLE_WORKSPACE_DIRECTORY_CONSENT_SCOPES));
  });
});

describe('canSyncGoogleWorkspaceDirectory', () => {
  it('returns false when disconnected', () => {
    expect(canSyncGoogleWorkspaceDirectory({ is_connected: false, scopes: null })).toBe(false);
  });

  it('allows sync when connected with unknown null scopes', () => {
    expect(canSyncGoogleWorkspaceDirectory({ is_connected: true, scopes: null })).toBe(true);
  });

  it('allows sync when directory scope is granted', () => {
    expect(
      canSyncGoogleWorkspaceDirectory({
        is_connected: true,
        scopes: 'https://www.googleapis.com/auth/admin.directory.user.readonly',
      }),
    ).toBe(true);
  });

  it('blocks sync when connected without directory scope', () => {
    expect(
      canSyncGoogleWorkspaceDirectory({
        is_connected: true,
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
      }),
    ).toBe(false);
  });
});
