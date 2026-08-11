import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GOOGLE_MAPS_AUTH_REQUIRED_MESSAGE,
  invokePublicGoogleMapsKey,
  resolveAuthenticatedSession,
  useGoogleMapsKey,
} from './useGoogleMapsKey';

const mockGetSession = vi.fn();
const mockGetUser = vi.fn();
const mockRefreshSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFunctionsInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const validSession = {
  access_token: 'test-access-token',
  user: { id: 'user-1' },
};

describe('resolveAuthenticatedSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when getSession has no access token', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(resolveAuthenticatedSession()).resolves.toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('returns the session when getUser succeeds', async () => {
    mockGetSession.mockResolvedValue({ data: { session: validSession }, error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    await expect(resolveAuthenticatedSession()).resolves.toEqual(validSession);
    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  it('refreshes when getUser fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: validSession }, error: null });
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid') });
    mockRefreshSession.mockResolvedValue({
      data: { session: { access_token: 'refreshed-token', user: { id: 'user-1' } } },
      error: null,
    });

    const session = await resolveAuthenticatedSession();
    expect(session?.access_token).toBe('refreshed-token');
  });
});

describe('invokePublicGoogleMapsKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries once after refreshing on a 401 function error', async () => {
    const unauthorized = { message: 'Edge Function returned a non-2xx status code', context: { status: 401 } };

    mockFunctionsInvoke
      .mockResolvedValueOnce({ data: null, error: unauthorized })
      .mockResolvedValueOnce({ data: { key: 'maps-key', mapId: null }, error: null });
    mockRefreshSession.mockResolvedValue({
      data: { session: validSession },
      error: null,
    });

    await expect(invokePublicGoogleMapsKey()).resolves.toEqual({
      key: 'maps-key',
      mapId: null,
    });

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockFunctionsInvoke).toHaveBeenCalledTimes(2);
  });
});

function installAuthListenerWithInitialSession(
  session: typeof validSession | null = validSession,
): void {
  mockOnAuthStateChange.mockImplementation((listener) => {
    queueMicrotask(() => {
      listener('INITIAL_SESSION', session);
    });
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
}

describe('useGoogleMapsKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  it('does not invoke the edge function before a session access token exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useGoogleMapsKey());

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('clears stale key state and sets an auth error when retry is called without a session', async () => {
    installAuthListenerWithInitialSession();
    mockGetSession.mockResolvedValue({
      data: { session: validSession },
      error: null,
    });
    mockFunctionsInvoke.mockResolvedValue({
      data: { key: 'maps-key', mapId: 'map-id' },
      error: null,
    });

    const { result } = renderHook(() => useGoogleMapsKey());

    await waitFor(() => {
      expect(result.current.googleMapsKey).toBe('maps-key');
      expect(result.current.mapId).toBe('map-id');
      expect(result.current.error).toBeNull();
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1);

    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    await result.current.retry();

    await waitFor(() => {
      expect(result.current.error).toBe(GOOGLE_MAPS_AUTH_REQUIRED_MESSAGE);
      expect(result.current.googleMapsKey).toBe('');
      expect(result.current.mapId).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1);
  });

  it('invokes the edge function after INITIAL_SESSION provides an access token', async () => {
    installAuthListenerWithInitialSession();
    mockGetSession.mockResolvedValue({
      data: { session: validSession },
      error: null,
    });
    mockFunctionsInvoke.mockResolvedValue({
      data: { key: 'maps-key', mapId: 'map-id' },
      error: null,
    });

    const { result } = renderHook(() => useGoogleMapsKey());

    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('public-google-maps-key', {
        body: expect.objectContaining({ cache_bust: expect.stringMatching(/^cache_bust_/) }),
      });
    });

    await waitFor(() => {
      expect(result.current.googleMapsKey).toBe('maps-key');
      expect(result.current.mapId).toBe('map-id');
      expect(result.current.error).toBeNull();
    });
  });

  it('dedupes concurrent fetch schedules when multiple auth events race', async () => {
    type GetSessionResult = { data: { session: typeof validSession }; error: null };
    let resolveGetSession: ((value: GetSessionResult) => void) | undefined;
    const getSessionDeferred = new Promise<GetSessionResult>((resolve) => {
      resolveGetSession = resolve;
    });

    const completeGetSession = (value: GetSessionResult) => {
      if (!resolveGetSession) {
        throw new Error('getSession deferred resolver was not initialized');
      }
      resolveGetSession(value);
    };

    mockGetSession.mockImplementation(() => getSessionDeferred);
    mockOnAuthStateChange.mockImplementation((listener) => {
      queueMicrotask(() => {
        listener('INITIAL_SESSION', validSession);
        listener('INITIAL_SESSION', validSession);
      });
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockFunctionsInvoke.mockResolvedValue({
      data: { key: 'maps-key', mapId: null },
      error: null,
    });

    renderHook(() => useGoogleMapsKey());

    await act(async () => {
      completeGetSession({ data: { session: validSession }, error: null });
    });

    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1);
    });
  });

  it('waits for auth state change when the initial session is missing', async () => {
    const lateSession = {
      access_token: 'late-token',
      user: { id: 'user-1' },
    };

    mockGetSession
      .mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockResolvedValue({ data: { session: lateSession }, error: null });

    let authListener: ((event: string, session: typeof lateSession | null) => void) | undefined;
    mockOnAuthStateChange.mockImplementation((listener) => {
      authListener = listener;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockFunctionsInvoke.mockResolvedValue({
      data: { key: 'maps-key', mapId: null },
      error: null,
    });

    renderHook(() => useGoogleMapsKey());

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });
    expect(mockFunctionsInvoke).not.toHaveBeenCalled();

    authListener?.('SIGNED_IN', lateSession);

    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1);
    });
  });

  it('skips fetching when enabled is false', async () => {
    renderHook(() => useGoogleMapsKey({ enabled: false }));

    await waitFor(() => {
      expect(mockGetSession).not.toHaveBeenCalled();
      expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    });
  });
});
