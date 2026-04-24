import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '@supabase/supabase-js';
import SmartLanding from '../SmartLanding';

// Stub the heavy lazy-loaded Landing chunk so tests don't pull in GSAP/d3
vi.mock('@/pages/Landing', () => ({
  default: () => <div data-testid="landing-stub">Landing</div>,
}));

// No-op PageSEO to keep the renderer light
vi.mock('@/components/seo/PageSEO', () => ({
  PageSEO: () => null,
}));

// Mock useAuth — each test overrides the return value as needed
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isLoading: false })),
}));

// Mock react-router-dom — same pattern as src/pages/__tests__/Auth.test.tsx
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import * as useAuthModule from '@/hooks/useAuth';

const mockUser: User = {
  id: 'u1',
  email: 'owner@apex.test',
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
};

const baseAuth = {
  signUp: vi.fn(),
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
};

describe('SmartLanding', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the public landing page when isLoading is true and user is null (issue #671 regression)', () => {
    // This is the exact branch that previously returned null, causing the 13–60+s black screen.
    // After the fix, the marketing hero must render regardless of isLoading state.
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      ...baseAuth,
      user: null,
      isLoading: true,
    });

    const { container } = render(<SmartLanding />);

    // The Suspense boundary renders the fallback spinner or the stub — either proves
    // the component returned non-null content. Root must never be empty.
    expect(container.firstChild).not.toBeNull();
  });

  it('renders the public landing page when isLoading is false and user is null', async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      ...baseAuth,
      user: null,
      isLoading: false,
    });

    render(<SmartLanding />);

    // Landing stub renders once the Suspense resolves
    expect(await screen.findByTestId('landing-stub')).toBeTruthy();
  });

  it('returns null when isLoading is false and user is authenticated', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      ...baseAuth,
      user: mockUser,
      isLoading: false,
    });

    const { container } = render(<SmartLanding />);

    // Authenticated + auth resolved → SmartLanding returns null (redirect fires via useEffect)
    expect(container.firstChild).toBeNull();
  });

  it('calls navigate("/dashboard", { replace: true }) when an authenticated user lands on /', async () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      ...baseAuth,
      user: mockUser,
      isLoading: false,
    });

    render(<SmartLanding />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});
