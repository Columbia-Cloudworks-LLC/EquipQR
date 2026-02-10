import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Auth from '../Auth';
import * as useAuthModule from '@/hooks/useAuth';

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    signInWithGoogle: vi.fn(() => Promise.resolve({ error: null })),
    isLoading: false
  }))
}));

vi.mock('@/hooks/usePendingRedirectHandler', () => ({
  usePendingRedirectHandler: vi.fn()
}));

vi.mock('@/hooks/useMFA', () => ({
  useMFA: () => ({
    factors: [],
    currentLevel: null,
    nextLevel: null,
    isEnrolled: false,
    isVerified: false,
    needsVerification: false,
    isLoading: false,
    enrollTOTP: vi.fn(),
    verifyTOTP: vi.fn(),
    unenrollFactor: vi.fn(),
    challengeAndVerify: vi.fn(),
    refreshMFAStatus: vi.fn(),
  }),
}));

// Mock components
vi.mock('@/components/auth/SignUpForm', () => ({
  default: ({ onSuccess, onError }: { onSuccess: (msg: string) => void; onError: (msg: string) => void }) => (
    <div data-testid="signup-form">
      <button onClick={() => onSuccess('Account created')}>Submit SignUp</button>
      <button onClick={() => onError('Signup failed')}>Trigger SignUp Error</button>
    </div>
  )
}));

vi.mock('@/components/auth/SignInForm', () => ({
  default: ({ onError }: { onError: (msg: string) => void }) => (
    <div data-testid="signin-form">
      <button onClick={() => onError('Invalid credentials')}>Trigger SignIn Error</button>
    </div>
  )
}));

vi.mock('@/components/layout/LegalFooter', () => ({
  default: () => <div data-testid="legal-footer">Legal Footer</div>
}));

vi.mock('@/components/ui/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>
}));

// Mock react-router hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ search: '' })
  };
});

describe('Auth Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe('Core Rendering', () => {
    it('renders welcome title and description', () => {
      render(<Auth />);

      expect(screen.getByText('Welcome to EquipQR™')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account or create a new one to get started')).toBeInTheDocument();
    });

    it('renders logo component', () => {
      render(<Auth />);

      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('renders sign in and sign up tabs', () => {
      render(<Auth />);

      expect(screen.getByRole('tab', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /sign up/i })).toBeInTheDocument();
    });

    it('renders legal footer', () => {
      render(<Auth />);

      expect(screen.getByTestId('legal-footer')).toBeInTheDocument();
    });

    it('renders Google sign in button', () => {
      render(<Auth />);

      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('shows signin form by default', () => {
      render(<Auth />);

      expect(screen.getByTestId('signin-form')).toBeInTheDocument();
    });

    it('renders both signin and signup tabs', () => {
      render(<Auth />);

      // Both tabs should be present
      const signinTab = screen.getByRole('tab', { name: /sign in/i });
      const signupTab = screen.getByRole('tab', { name: /sign up/i });
      
      expect(signinTab).toBeInTheDocument();
      expect(signupTab).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message from signin form', async () => {
      render(<Auth />);

      const errorButton = screen.getByText('Trigger SignIn Error');
      fireEvent.click(errorButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when auth is loading', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        signInWithGoogle: vi.fn(),
        isLoading: true,
        session: null,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      render(<Auth />);

      // The loader should be present
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Authenticated User Redirect', () => {
    it('navigates to home when user is already authenticated', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: { id: 'user-1', email: 'test@test.com' },
        signInWithGoogle: vi.fn(),
        isLoading: false,
        session: { user: { id: 'user-1' } },
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      } as ReturnType<typeof useAuthModule.useAuth>);

      render(<Auth />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('QR Scan Flow', () => {
    it('shows QR scan message when coming from QR scan', () => {
      sessionStorage.setItem('pendingRedirect', '/equipment/123?qr=true');

      render(<Auth />);

      expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
      expect(screen.getByText('Complete sign in to view scanned equipment')).toBeInTheDocument();
    });
  });

  describe('Google Sign In', () => {
    it('calls signInWithGoogle when Google button is clicked', async () => {
      const mockSignInWithGoogle = vi.fn(() => Promise.resolve({ error: null }));
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        signInWithGoogle: mockSignInWithGoogle,
        isLoading: false,
        session: null,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      render(<Auth />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
      });
    });

    it('displays error when Google sign in fails', async () => {
      const mockSignInWithGoogle = vi.fn(() => Promise.resolve({ error: { message: 'Google auth failed' } }));
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        signInWithGoogle: mockSignInWithGoogle,
        isLoading: false,
        session: null,
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn()
      });

      render(<Auth />);

      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText('Google auth failed')).toBeInTheDocument();
      });
    });
  });
});

