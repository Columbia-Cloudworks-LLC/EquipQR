import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Auth from '../Auth';
import * as useAuthModule from '@/hooks/useAuth';

const mockErrorToast = vi.hoisted(() => vi.fn());
const mockSuccessToast = vi.hoisted(() => vi.fn());
const mockLocation = vi.hoisted(() => ({ search: '' }));

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

vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({
    error: mockErrorToast,
    success: mockSuccessToast,
    info: vi.fn(),
    warning: vi.fn(),
    toast: vi.fn(),
  }),
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
  default: ({
    onSuccess,
    onError,
  }: {
    onSuccess: (msg: string, email?: string) => void;
    onError: (msg: string) => void;
  }) => (
    <div data-testid="signup-form">
      <button onClick={() => onSuccess('Account created', 'viralarchitect@yahoo.com')}>Submit SignUp</button>
      <button onClick={() => onSuccess('Legal acceptance recorded successfully.')}>Retry Acceptance Success</button>
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
    useLocation: () => mockLocation
  };
});

describe('Auth Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockLocation.search = '';
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

  describe('Success Handling', () => {
    it('shows a dedicated check-your-email confirmation after signup succeeds', async () => {
      mockLocation.search = '?tab=signup';
      render(<Auth />);

      fireEvent.click(screen.getByText('Submit SignUp'));

      await waitFor(() => {
        expect(screen.getByTestId('signup-success-page')).toHaveTextContent('Check your email');
        expect(screen.getByTestId('signup-success-page')).toHaveTextContent('viralarchitect@yahoo.com');
        expect(screen.getByTestId('signup-success-page')).toHaveTextContent('Account created');
      });
      expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /open email inbox/i })).toHaveAttribute('href', 'https://mail.yahoo.com/');
      expect(screen.getByRole('link', { name: /open email inbox/i })).toHaveAttribute('rel', 'noopener noreferrer');
      expect(mockSuccessToast).toHaveBeenCalledWith({
        title: 'Check your email',
        description: 'Account created',
        duration: 10000,
      });
    });

    it('shows a generic success toast for non-signup success without email confirmation page', async () => {
      mockLocation.search = '?tab=signup';
      render(<Auth />);

      fireEvent.click(screen.getByText('Retry Acceptance Success'));

      await waitFor(() => {
        expect(mockSuccessToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Legal acceptance recorded successfully.',
          duration: 10000,
        });
      });
      expect(screen.queryByTestId('signup-success-page')).not.toBeInTheDocument();
      expect(screen.getByTestId('signup-form')).toBeInTheDocument();
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
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
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

    it('restores QR prompt from OAuth next query param (#1322)', async () => {
      // sessionStorage cleared in beforeEach — only `?next=` seeds the destination.
      mockLocation.search = `?next=${encodeURIComponent('/qr/equipment/abc-123?qr=true')}`;

      render(<Auth />);

      expect(
        await screen.findByText('Complete sign in to view scanned equipment'),
      ).toBeInTheDocument();
    });

    it('ignores unsafe OAuth next query param', () => {
      mockLocation.search = '?next=https%3A%2F%2Fevil.com';

      render(<Auth />);

      expect(
        screen.queryByText('Complete sign in to view scanned equipment'),
      ).not.toBeInTheDocument();
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

