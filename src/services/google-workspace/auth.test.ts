import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateGoogleWorkspaceAuthUrl } from './auth';

const rpcMock = vi.fn();

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

  it('builds a Google OAuth URL with a session-backed state', async () => {
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
  });
});

