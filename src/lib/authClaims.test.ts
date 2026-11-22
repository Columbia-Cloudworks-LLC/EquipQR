import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRetryableFetchError } from '@supabase/supabase-js';

const mockGetClaims = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getClaims: mockGetClaims } },
}));

import { getAuthClaims, requireAuthUserIdFromClaims } from './authClaims';

const STORAGE_KEY = 'sb-projectref-auth-token';

function storeSession() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      access_token: 'access',
      refresh_token: 'refresh',
      user: { id: 'stored-user', email: 'tech@example.com' },
    }),
  );
}

describe('authClaims', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://projectref.supabase.co');
    localStorage.clear();
    mockGetClaims.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns verified claims when the Auth server is reachable', async () => {
    storeSession();
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'verified-user' } }, error: null });

    await expect(getAuthClaims()).resolves.toMatchObject({ sub: 'verified-user' });
  });

  it('falls back to the stored session when the Auth server cannot be reached', async () => {
    storeSession();
    mockGetClaims.mockResolvedValue({
      data: null,
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    });

    await expect(getAuthClaims()).resolves.toMatchObject({
      sub: 'stored-user',
      email: 'tech@example.com',
    });
    await expect(requireAuthUserIdFromClaims()).resolves.toBe('stored-user');
  });

  it('falls back to the stored session when the claims lookup throws a network error', async () => {
    storeSession();
    mockGetClaims.mockRejectedValue(new AuthRetryableFetchError('Failed to fetch', 0));

    await expect(getAuthClaims()).resolves.toMatchObject({ sub: 'stored-user' });
  });

  it('does not fall back when the server rejects the session', async () => {
    storeSession();
    mockGetClaims.mockResolvedValue({ data: null, error: new Error('invalid JWT') });

    await expect(getAuthClaims()).resolves.toBeNull();
    await expect(requireAuthUserIdFromClaims()).rejects.toThrow('User not authenticated');
  });

  it('returns null offline when no session is stored on the device', async () => {
    mockGetClaims.mockResolvedValue({
      data: null,
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    });

    await expect(getAuthClaims()).resolves.toBeNull();
  });
});
