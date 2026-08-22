import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { AuthContext } from '@/contexts/AuthContext';
import React from 'react';
import type { User, Session } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    }
  }
}));

// Create mock context value
interface MockAuthContextOverrides {
  user?: User | null;
  session?: Session | null;
  isLoading?: boolean;
  signIn?: () => Promise<{ error: Error | null }>;
  signUp?: () => Promise<{ error: Error | null }>;
  signOut?: () => Promise<void>;
  signInWithGoogle?: () => Promise<{ error: Error | null }>;
}

type AuthContextValue = NonNullable<React.ContextType<typeof AuthContext>>;

const defaultMockUser = {
  id: 'user-1',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
} as User;

const createMockAuthContextValue = (
  overrides: MockAuthContextOverrides = {},
): AuthContextValue => ({
  user: overrides.user !== undefined ? overrides.user : defaultMockUser,
  session:
    overrides.session !== undefined
      ? overrides.session
      : ({
          access_token: 'token',
          refresh_token: 'refresh_token',
          expires_in: 3600,
          token_type: 'bearer',
          user: defaultMockUser,
        } as Session),
  isLoading: overrides.isLoading ?? false,
  signIn: overrides.signIn ?? vi.fn(),
  signUp: overrides.signUp ?? vi.fn(),
  signOut: overrides.signOut ?? vi.fn(),
  signInWithGoogle: overrides.signInWithGoogle ?? vi.fn(),
});

describe('useAuth', () => {
  let queryClient: QueryClient;
  let mockContextValue = createMockAuthContextValue();

  const createWrapper = (contextValue = mockContextValue) => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={contextValue}>
          {children}
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockContextValue = createMockAuthContextValue();
  });

  it('should return user and session data', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.user).toEqual({
      id: 'user-1',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00Z'
    });
    expect(result.current.session).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should provide authentication methods', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signUp).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
  });

  it('should handle loading state', () => {
    const loadingContextValue = createMockAuthContextValue({
      user: null,
      session: null,
      isLoading: true,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(loadingContextValue),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should handle unauthenticated state', () => {
    const unauthenticatedContextValue = createMockAuthContextValue({
      user: null,
      session: null,
      isLoading: false,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(unauthenticatedContextValue),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});