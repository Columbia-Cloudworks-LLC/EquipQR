/* eslint-disable no-console */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { AuthProvider, AuthContext } from './AuthContext';
import type { User, Session, AuthError } from '@supabase/supabase-js';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// Import the mocked module
import { supabase } from '@/integrations/supabase/client';

// Mock data
const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: { name: 'Test User' },
};

const mockSession: Session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};

describe('AuthContext', () => {
  let mockSubscription: { unsubscribe: () => void; id: string; callback: () => void };
  let authStateChangeCallback: (event: string, session: Session | null) => void;
  /** Session emitted on INITIAL_SESSION (mirrors SDK bootstrap after storage init). */
  let initialSession: Session | null;

  beforeEach(() => {
    vi.useFakeTimers();
    initialSession = null;
    
    mockSubscription = { 
      unsubscribe: vi.fn(),
      id: 'mock-subscription',
      callback: vi.fn()
    };
    
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authStateChangeCallback = callback;
      // Supabase emits INITIAL_SESSION after initializePromise — async, not sync.
      void Promise.resolve().then(() => {
        callback('INITIAL_SESSION', initialSession);
      });
      return { data: { subscription: mockSubscription } };
    });
    
    // getSession remains for deferred admin-grants path on SIGNED_IN only.
    vi.mocked(supabase.auth.getSession).mockImplementation(() => 
      Promise.resolve({
        data: { session: null },
        error: null,
      })
    );
    
    vi.mocked(supabase.auth.signUp).mockImplementation(() => 
      Promise.resolve({ 
        data: { user: null, session: null },
        error: null 
      })
    );
    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(() => 
      Promise.resolve({ 
        data: { user: null, session: null },
        error: null 
      })
    );
    vi.mocked(supabase.auth.signInWithOAuth).mockImplementation(() => 
      Promise.resolve({ 
        data: { provider: 'google' as const, url: null },
        error: null 
      })
    );
    vi.mocked(supabase.auth.signOut).mockImplementation(() => 
      Promise.resolve({ error: null })
    );
    
    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // Mock window.location
    const locationMock = {
      origin: 'http://localhost:3000',
      href: 'http://localhost:3000',
      assign: vi.fn((url: string) => {
        locationMock.href = url;
      }),
    };
    Object.defineProperty(window, 'location', {
      value: locationMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  const renderAuthHook = () =>
    renderHook(() => React.useContext(AuthContext), { wrapper: createWrapper() });

  const flushAuthTimers = async () => {
    await act(async () => {
      await vi.runAllTimersAsync();
    });
  };

  it('should initialize with loading state', () => {
    const { result } = renderAuthHook();

    expect(result.current?.isLoading).toBe(true);
    expect(result.current?.user).toBe(null);
    expect(result.current?.session).toBe(null);
  });

  it('should set user and session on INITIAL_SESSION bootstrap', async () => {
    initialSession = mockSession;

    const { result } = renderAuthHook();

    // Wait for INITIAL_SESSION microtask from onAuthStateChange
    await flushAuthTimers();

    expect(result.current?.isLoading).toBe(false);
    expect(result.current?.user).toEqual(mockUser);
    expect(result.current?.session).toEqual(mockSession);
    expect(vi.mocked(supabase.auth.getSession)).not.toHaveBeenCalled();
  });

  it('should not call getSession on mount for bootstrap', async () => {
    const { result } = renderAuthHook();

    await flushAuthTimers();

    expect(result.current?.isLoading).toBe(false);
    expect(vi.mocked(supabase.auth.getSession)).not.toHaveBeenCalled();
  });

  it('should handle sign-in auth state change', async () => {
    const { result } = renderAuthHook();

    // Wait for initial load
    await flushAuthTimers();

    expect(result.current?.isLoading).toBe(false);

    act(() => {
      authStateChangeCallback('SIGNED_IN', mockSession);
    });

    expect(result.current?.user).toEqual(mockUser);
    expect(result.current?.session).toEqual(mockSession);
  });

  it('should handle pending redirect after sign-in', async () => {
    const mockRedirectUrl = 'http://localhost:3000/equipment/123';
    
    window.sessionStorage.getItem = vi.fn().mockReturnValue(mockRedirectUrl);
    window.sessionStorage.removeItem = vi.fn();

    const { result } = renderAuthHook();

    // Wait for initial load
    await flushAuthTimers();

    expect(result.current?.isLoading).toBe(false);

    act(() => {
      authStateChangeCallback('SIGNED_IN', mockSession);
    });

    // Fast-forward timers to trigger timeout
    act(() => {
      vi.runAllTimers();
    });

    expect(window.sessionStorage.getItem).toHaveBeenCalledWith('pendingRedirect');
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('pendingRedirect');
  });

  it('should handle token refresh without triggering redirect', async () => {
    const { result } = renderAuthHook();

    // Wait for initial load
    await flushAuthTimers();

    expect(result.current?.isLoading).toBe(false);

    act(() => {
      authStateChangeCallback('TOKEN_REFRESHED', mockSession);
    });

    expect(result.current?.user).toEqual(mockUser);
    expect(result.current?.session).toEqual(mockSession);
    expect(window.sessionStorage.getItem).not.toHaveBeenCalled();
  });

  it('should handle sign up', async () => {
    const { result } = renderAuthHook();

    // Wait for initial load
    await flushAuthTimers();

    expect(result.current?.isLoading).toBe(false);

    let signUpResult;
    await act(async () => {
      signUpResult = await result.current!.signUp('test@example.com', 'password', 'Test User');
    });

    expect(vi.mocked(supabase.auth.signUp)).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
      options: {
        emailRedirectTo: 'http://localhost:3000/',
        data: {
          name: 'Test User'
        }
      }
    });
    expect(signUpResult).toEqual({ error: null });
  });

  it('should reject empty/whitespace signup names and trim valid name/email', async () => {
    const { result } = renderAuthHook();
    await flushAuthTimers();

    let whitespaceResult;
    await act(async () => {
      whitespaceResult = await result.current!.signUp('  test@example.com  ', 'password', '  ');
    });
    expect(whitespaceResult).toEqual({ error: new Error('Full name is required') });
    expect(vi.mocked(supabase.auth.signUp)).not.toHaveBeenCalled();

    let emptyResult;
    await act(async () => {
      emptyResult = await result.current!.signUp('test@example.com', 'password', '');
    });
    expect(emptyResult).toEqual({ error: new Error('Full name is required') });
    expect(vi.mocked(supabase.auth.signUp)).not.toHaveBeenCalled();

    await act(async () => {
      await result.current!.signUp('  ada@example.com  ', 'password', '  Ada Lovelace  ');
    });
    expect(vi.mocked(supabase.auth.signUp)).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ada@example.com',
        options: expect.objectContaining({
          data: { name: 'Ada Lovelace' },
        }),
      }),
    );
  });

  it('should handle sign in', async () => {
    const { result } = renderAuthHook();

    // Wait for initial load
    await flushAuthTimers();

    expect(result.current?.isLoading).toBe(false);

    let signInResult;
    await act(async () => {
      signInResult = await result.current!.signIn('test@example.com', 'password');
    });

    expect(vi.mocked(supabase.auth.signInWithPassword)).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    });
    expect(signInResult).toEqual({ error: null });
  });

  it('should handle Google sign in with /auth redirectTo by default', async () => {
    window.sessionStorage.getItem = vi.fn().mockReturnValue(null);

    const { result } = renderAuthHook();

    // Wait for initial load
    await flushAuthTimers();

    expect(result.current?.isLoading).toBe(false);

    let signInResult;
    await act(async () => {
      signInResult = await result.current!.signInWithGoogle();
    });

    expect(vi.mocked(supabase.auth.signInWithOAuth)).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/auth',
      },
    });
    expect(signInResult).toEqual({ error: null });
  });

  it('should pass pendingRedirect as next on Google OAuth redirectTo', async () => {
    const pending = '/qr/equipment/abc-123?qr=true';
    window.sessionStorage.getItem = vi.fn().mockReturnValue(pending);

    const { result } = renderAuthHook();
    await flushAuthTimers();

    await act(async () => {
      await result.current!.signInWithGoogle();
    });

    expect(window.sessionStorage.getItem).toHaveBeenCalledWith('pendingRedirect');
    expect(vi.mocked(supabase.auth.signInWithOAuth)).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: `http://localhost:3000/auth?next=${encodeURIComponent(pending)}`,
      },
    });
  });

  it('should ignore unsafe pendingRedirect when building Google OAuth redirectTo', async () => {
    window.sessionStorage.getItem = vi.fn().mockReturnValue('https://evil.com');

    const { result } = renderAuthHook();
    await flushAuthTimers();

    await act(async () => {
      await result.current!.signInWithGoogle();
    });

    expect(vi.mocked(supabase.auth.signInWithOAuth)).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/auth',
      },
    });
  });

  it('should handle sign out', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    const { result } = renderAuthHook();

    // Set up initial state with user
    act(() => {
      authStateChangeCallback('SIGNED_IN', mockSession);
    });

    await act(async () => {
      await result.current!.signOut();
    });

    expect(vi.mocked(supabase.auth.signOut)).toHaveBeenCalled();
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('pendingRedirect');
    expect(result.current?.user).toBe(null);
    expect(result.current?.session).toBe(null);
  });

  it('should handle sign out errors gracefully', async () => {
    const mockError = {
      message: 'Network error',
      code: 'network_error',
      status: 500,
    } as AuthError;
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: mockError });
    console.warn = vi.fn();

    const { result } = renderAuthHook();

    await act(async () => {
      await result.current!.signOut();
    });

    expect(console.warn).toHaveBeenCalledWith('⚠️ Server-side logout failed', mockError);
    expect(result.current?.user).toBe(null);
    expect(result.current?.session).toBe(null);
  });

  it('should clean up subscription on unmount', () => {
    const { unmount } = renderAuthHook();

    unmount();

    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
  });
});