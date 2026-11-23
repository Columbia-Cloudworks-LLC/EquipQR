import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRetryableFetchError } from '@supabase/supabase-js';
import { isAuthConnectivityFailure, readStoredAuthSession, sessionIdFromAccessToken } from './offlineSession';

const STORAGE_KEY = 'sb-projectref-auth-token';

const storedSession = {
  access_token: 'access',
  refresh_token: 'refresh',
  expires_at: 1,
  user: { id: 'user-1', email: 'tech@example.com' },
};

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });
}

describe('offlineSession', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://projectref.supabase.co');
    localStorage.clear();
    setOnline(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    setOnline(true);
  });

  it('returns the session supabase-js stored, even when its token has expired', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedSession));

    expect(readStoredAuthSession()?.user.id).toBe('user-1');
  });

  it('returns null when nothing is stored', () => {
    expect(readStoredAuthSession()).toBeNull();
  });

  it.each([
    ['unparseable text', 'not json'],
    ['a session without a user', JSON.stringify({ access_token: 'a', refresh_token: 'r' })],
    ['a session without tokens', JSON.stringify({ user: { id: 'user-1' } })],
  ])('returns null for %s', (_label, raw) => {
    localStorage.setItem(STORAGE_KEY, raw);

    expect(readStoredAuthSession()).toBeNull();
  });

  it('treats an unreachable Auth server as a connectivity failure', () => {
    expect(isAuthConnectivityFailure(new AuthRetryableFetchError('Failed to fetch', 0))).toBe(true);
  });

  it('treats any auth failure as connectivity-related while the browser is offline', () => {
    setOnline(false);

    expect(isAuthConnectivityFailure(new Error('anything'))).toBe(true);
  });

  it('does not treat a rejected session as a connectivity failure', () => {
    expect(isAuthConnectivityFailure(new Error('Invalid Refresh Token'))).toBe(false);
  });
});

describe('sessionIdFromAccessToken', () => {
  const token = (claims: object) => `header.${btoa(JSON.stringify(claims))}.signature`;

  it('reads the session a token belongs to', () => {
    expect(sessionIdFromAccessToken(token({ session_id: 'session-a', sub: 'user-1' }))).toBe('session-a');
  });

  it('returns null for a missing, malformed or session-less token', () => {
    expect(sessionIdFromAccessToken(undefined)).toBeNull();
    expect(sessionIdFromAccessToken('not-a-token')).toBeNull();
    expect(sessionIdFromAccessToken('header.%%%.signature')).toBeNull();
    expect(sessionIdFromAccessToken(token({ sub: 'user-1' }))).toBeNull();
  });
});
