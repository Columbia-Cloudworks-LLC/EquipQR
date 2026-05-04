import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SignUpForm from '../SignUpForm';

import { supabase } from '@/integrations/supabase/client';
import type { AuthError } from '@supabase/supabase-js';

// Mock environment variable for hCaptcha
vi.stubEnv('VITE_HCAPTCHA_SITEKEY', 'test-hcaptcha-site-key');

vi.mock('@/lib/hibpPasswordCheck', () => ({
  checkPasswordBreachedHibp: vi.fn(() => Promise.resolve({ status: 'ok' as const, breached: false })),
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

// Mock HCaptcha component
interface HCaptchaProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

vi.mock('@/components/ui/HCaptcha', () => ({
  default: ({ onSuccess, onError, onExpire }: HCaptchaProps) => (
    <div data-testid="hcaptcha-mock">
      <button 
        type="button"
        onClick={() => onSuccess('mock-captcha-token')}
        data-testid="hcaptcha-success"
      >
        Verify Captcha
      </button>
      <button 
        type="button"
        onClick={() => onError?.()}
        data-testid="hcaptcha-error"
      >
        Trigger Error
      </button>
      <button 
        type="button"
        onClick={() => onExpire?.()}
        data-testid="hcaptcha-expire"
      >
        Trigger Expire
      </button>
    </div>
  )
}));

const mockSignUp = vi.mocked(supabase.auth.signUp);
const mockGetSession = vi.mocked(supabase.auth.getSession);

const withRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

// Helper to fill form fields quickly using fireEvent.change (much faster than userEvent.type)
interface FormData {
  name?: string;
  email?: string;
  organization?: string;
  password?: string;
  confirmPassword?: string;
  verifyCaptcha?: boolean;
}

const fillFormFast = (overrides: FormData = {}) => {
  const defaults: FormData = {
    name: 'John Doe',
    email: 'john@example.com',
    organization: 'Test Org',
    password: 'SecurePass1!',
    confirmPassword: 'SecurePass1!',
    verifyCaptcha: true,
  };
  const data = { ...defaults, ...overrides };

  if (data.name !== undefined) {
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: data.name } });
  }
  if (data.email !== undefined) {
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: data.email } });
  }
  if (data.organization !== undefined) {
    fireEvent.change(screen.getByLabelText(/organization name/i), { target: { value: data.organization } });
  }
  if (data.password !== undefined) {
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: data.password } });
  }
  if (data.confirmPassword !== undefined) {
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: data.confirmPassword } });
  }
  fireEvent.click(screen.getByLabelText(/I have read and agree/i));
  if (data.verifyCaptcha) {
    fireEvent.click(screen.getByTestId('hcaptcha-success'));
  }
};

describe('SignUpForm', () => {
  const defaultProps = {
    onSuccess: vi.fn(),
    onError: vi.fn(),
    isLoading: false,
    setIsLoading: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockResolvedValue({
      error: null,
      data: {
        user: { id: 'u1' } as never,
        session: { access_token: 'test-access-token' } as never,
      },
    });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-access-token' } as never },
      error: null,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
        if (url.includes('record-terms-acceptance')) {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        return new Response('not mocked', { status: 500 });
      }),
    );
  });

  describe('Form Rendering', () => {
    it('should render all form fields correctly', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByTestId('hcaptcha-mock')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account & organization/i })).toBeInTheDocument();
    });

    it('should have correct input types and attributes', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/full name/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText(/organization name/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('type', 'password');
      
      // Check required attributes
      expect(screen.getByLabelText(/full name/i)).toBeRequired();
      expect(screen.getByLabelText(/email/i)).toBeRequired();
      expect(screen.getByLabelText(/organization name/i)).toBeRequired();
      expect(screen.getByLabelText('Password')).toBeRequired();
      expect(screen.getByLabelText(/confirm password/i)).toBeRequired();
    });

    it('should have organization name placeholder', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/organization name/i)).toHaveAttribute(
        'placeholder', 
        'Enter your organization name'
      );
    });
  });

  describe('Input Handling', () => {
    it('should update form data when inputs change', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const orgInput = screen.getByLabelText(/organization name/i);
      
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      fireEvent.change(orgInput, { target: { value: 'Test Organization' } });
      
      expect(nameInput).toHaveValue('John Doe');
      expect(emailInput).toHaveValue('john@example.com');
      expect(orgInput).toHaveValue('Test Organization');
    });

    it('should handle password input changes', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      fireEvent.change(passwordInput, { target: { value: 'SecurePass1!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'SecurePass1!' } });
      
      expect(passwordInput).toHaveValue('SecurePass1!');
      expect(confirmPasswordInput).toHaveValue('SecurePass1!');
    });
  });

  describe('Password Validation', () => {
    // These tests need userEvent.type() to test real-time validation as user types
    // Using delay: null removes inter-keystroke delays for faster execution
    
    it('should show password length validation error', async () => {
      const user = userEvent.setup({ delay: null });
      withRouter(<SignUpForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, '123');
      fireEvent.blur(passwordInput);

      const fieldRoot = passwordInput.closest('div.space-y-2');
      const inlineError = fieldRoot?.querySelector('p.text-destructive');
      expect(inlineError).toBeTruthy();
      expect(inlineError).toHaveTextContent(/At least 12 characters/i);
    });

    it('should not show password length error for valid password', async () => {
      const user = userEvent.setup({ delay: null });
      withRouter(<SignUpForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'SecurePass1!');

      const fieldRoot = passwordInput.closest('div.space-y-2');
      expect(fieldRoot?.querySelector('p.text-destructive')).toBeNull();
    });

    it('should show password match validation in real-time', async () => {
      const user = userEvent.setup({ delay: null });
      withRouter(<SignUpForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(passwordInput, 'SecurePass1!');
      await user.type(confirmPasswordInput, 'SecurePass2!');
      
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      expect(screen.getByTestId('password-match-error')).toBeInTheDocument();
    });

    it('should show success icon when passwords match', async () => {
      const user = userEvent.setup({ delay: null });
      withRouter(<SignUpForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(passwordInput, 'SecurePass1!');
      await user.type(confirmPasswordInput, 'SecurePass1!');
      
      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('password-match-success')).toBeInTheDocument();
    });

    it('should validate password match when changing password field', async () => {
      const user = userEvent.setup({ delay: null });
      withRouter(<SignUpForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      // Set confirm password first
      await user.type(confirmPasswordInput, 'SecurePass1!');
      // Then set password that doesn't match
      await user.type(passwordInput, 'Different1!');
      
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    it('should clear password match indicator when confirm password is empty', async () => {
      const user = userEvent.setup({ delay: null });
      withRouter(<SignUpForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(passwordInput, 'SecurePass1!');
      await user.type(confirmPasswordInput, 'SecurePass1!');
      
      // Clear confirm password
      await user.clear(confirmPasswordInput);
      
      expect(screen.queryByTestId('password-match-success')).not.toBeInTheDocument();
      expect(screen.queryByTestId('password-match-error')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when form is invalid', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when form is valid', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      // Fill all required fields using fast helper
      fillFormFast();
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeEnabled();
    });

    it('should require all fields to be valid', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      
      // Fill some fields but not all (missing org, password, confirm password, captcha)
      fillFormFast({ organization: '', password: '', confirmPassword: '', verifyCaptcha: false });
      
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit when password does not meet complexity', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      fillFormFast({ password: 'ab', confirmPassword: 'ab' });
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeDisabled();
    });

    it('should require passwords to match', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      // Fill form with mismatched passwords
      fillFormFast({ confirmPassword: 'SecurePass2!' });
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeDisabled();
    });

    it('should require captcha verification', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      // Fill form but don't verify captcha
      fillFormFast({ verifyCaptcha: false });
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('HCaptcha Integration', () => {
    it('should enable form submission after captcha verification', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      // Fill form using fast helper
      fillFormFast();
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeEnabled();
    });

    it('should handle captcha error', () => {
      const onError = vi.fn();
      withRouter(<SignUpForm {...defaultProps} onError={onError} />);
      
      fireEvent.click(screen.getByTestId('hcaptcha-error'));
      
      expect(onError).toHaveBeenCalledWith('CAPTCHA verification failed. Please try again.');
    });

    it('should handle captcha expiration', () => {
      const onError = vi.fn();
      withRouter(<SignUpForm {...defaultProps} onError={onError} />);
      
      fireEvent.click(screen.getByTestId('hcaptcha-expire'));
      
      expect(onError).toHaveBeenCalledWith('CAPTCHA expired. Please complete it again.');
    });
  });

  describe('Form Submission', () => {
    it('should submit form with correct data', async () => {
      const onSuccess = vi.fn();
      withRouter(<SignUpForm {...defaultProps} onSuccess={onSuccess} />);
      
      // Fill form with specific values for assertion
      fillFormFast({ organization: 'Test Organization' });
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /create account & organization/i }));
      
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'SecurePass1!',
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name: 'John Doe',
              organization_name: 'Test Organization'
            },
            captchaToken: 'mock-captcha-token'
          }
        });
      });
      
      expect(onSuccess).toHaveBeenCalledWith(
        'Account created successfully! Please check your email to verify your account and complete organization setup.'
      );
    });

    it('should handle submission with incomplete form', async () => {
      const onError = vi.fn();
      withRouter(<SignUpForm {...defaultProps} onError={onError} />);
      
      // Try to submit without filling form (this shouldn't happen due to disabled button, but test anyway)
      const form = screen.getByRole('button', { name: /create account & organization/i }).closest('form');
      
      await act(async () => {
        if (form) {
          const event = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(event);
        }
      });
      
      expect(onError).toHaveBeenCalledWith(
        'Please accept the Terms of Service and Privacy Policy to continue.',
      );
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('should handle Supabase signup error', async () => {
      const onError = vi.fn();
      const setIsLoading = vi.fn();
      
      mockSignUp.mockResolvedValue({ 
        error: {
          message: 'Email already registered',
          code: 'user_already_exists',
          status: 400,
          name: 'AuthError'
        } as AuthError,
        data: { user: null, session: null } 
      });
      
      withRouter(<SignUpForm {...defaultProps} onError={onError} setIsLoading={setIsLoading} />);
      
      // Fill form using fast helper
      fillFormFast();
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /create account & organization/i }));
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Email already registered');
        expect(setIsLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should handle unexpected errors', async () => {
      const onError = vi.fn();
      const setIsLoading = vi.fn();
      
      mockSignUp.mockRejectedValue(new Error('Network error'));
      
      withRouter(<SignUpForm {...defaultProps} onError={onError} setIsLoading={setIsLoading} />);
      
      // Fill form using fast helper
      fillFormFast();
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /create account & organization/i }));
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Network error');
        expect(setIsLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should manage loading state during submission', async () => {
      const setIsLoading = vi.fn();
      
      // Use instant resolution instead of setTimeout
      mockSignUp.mockResolvedValue({ error: null, data: { user: null, session: null } });
      
      withRouter(<SignUpForm {...defaultProps} setIsLoading={setIsLoading} />);
      
      // Fill form using fast helper
      fillFormFast();
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /create account & organization/i }));
      
      expect(setIsLoading).toHaveBeenCalledWith(true);
      
      await waitFor(() => {
        expect(setIsLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should reset captcha token on error', async () => {
      mockSignUp.mockResolvedValue({ 
        error: {
          message: 'Signup failed',
          code: 'signup_error',
          status: 400,
          name: 'AuthError'
        } as AuthError,
        data: { user: null, session: null } 
      });
      
      withRouter(<SignUpForm {...defaultProps} />);
      
      // Fill form using fast helper
      fillFormFast();
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeEnabled();
      
      // Submit form (will fail)
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        // Form should be disabled again because captcha token was reset
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      withRouter(<SignUpForm {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account & organization/i })).toBeDisabled();
    });

    it('should not show loading spinner when isLoading is false', () => {
      withRouter(<SignUpForm {...defaultProps} isLoading={false} />);
      
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('should prevent multiple rapid submissions', async () => {
      const setIsLoading = vi.fn();
      type SignUpResolution = { error: null; data: { user: null; session: null } };
      let resolveSignUp!: (value: SignUpResolution) => void;
      
      // Mock signUp with a controlled promise that doesn't resolve immediately
      mockSignUp.mockImplementation(() => 
        new Promise(resolve => {
          resolveSignUp = resolve;
        })
      );
      
      const TestWrapper = () => {
        const [isLoading, setIsLoadingState] = React.useState(false);
        
        return (
          <MemoryRouter>
            <SignUpForm 
              {...defaultProps} 
              isLoading={isLoading} 
              setIsLoading={(loading: boolean) => {
                setIsLoadingState(loading);
                setIsLoading(loading);
              }} 
            />
          </MemoryRouter>
        );
      };
      
      render(<TestWrapper />);
      
      // Fill form using fast helper
      fillFormFast();
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      
      // Fire first click - this starts the submission
      fireEvent.click(submitButton);
      
      // Wait for the button to be disabled (loading state active)
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
      
      // Now attempt additional clicks while button is disabled
      // These should NOT trigger additional submissions
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      
      // Verify only ONE call was made despite multiple click attempts
      expect(mockSignUp).toHaveBeenCalledTimes(1);
      
      // Resolve the promise to clean up
      resolveSignUp({
        error: null,
        data: { user: null, session: { access_token: 'tok' } as never },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long input values', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      const longString = 'a'.repeat(200);
      const nameInput = screen.getByLabelText(/full name/i);
      
      fireEvent.change(nameInput, { target: { value: longString } });
      expect(nameInput).toHaveValue(longString);
    });

    it('should handle special characters in organization name', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      const orgInput = screen.getByLabelText(/organization name/i);
      const specialString = 'Test Org & Co. - "Best Company" #1!';
      
      fireEvent.change(orgInput, { target: { value: specialString } });
      expect(orgInput).toHaveValue(specialString);
    });

    it('should handle non-Error exceptions', async () => {
      const onError = vi.fn();
      
      mockSignUp.mockRejectedValue('String error');
      
      withRouter(<SignUpForm {...defaultProps} onError={onError} />);
      
      // Fill and submit form using fast helper
      fillFormFast();
      fireEvent.click(screen.getByRole('button', { name: /create account & organization/i }));
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('An error occurred during sign up');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper label associations', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/full name/i)).toHaveAttribute('id', 'signup-name');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('id', 'signup-email');
      expect(screen.getByLabelText(/organization name/i)).toHaveAttribute('id', 'signup-organization');
      expect(screen.getByLabelText('Password')).toHaveAttribute('id', 'signup-password');
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('id', 'signup-confirm-password');
    });

    it('should support keyboard navigation', async () => {
      // Keep userEvent for keyboard navigation testing, but use delay: null
      const user = userEvent.setup({ delay: null });
      withRouter(<SignUpForm {...defaultProps} />);
      
      // Notice-at-collection link is first in tab order
      await user.tab();
      expect(screen.getByRole('link', { name: /Privacy Notice at Collection/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/full name/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/email/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/organization name/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Password')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/confirm password/i)).toHaveFocus();
    });
  });

  describe('Email Prefilling', () => {
    it('should prefill email when prefillEmail prop is provided', () => {
      render(
        <SignUpForm 
          {...defaultProps} 
          prefillEmail="prefilled@example.com"
        />,
        { wrapper: RouterWrapper }
      );
      
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('prefilled@example.com');
    });

    it('should update email when prefillEmail prop changes', async () => {
      const { rerender } = render(
        <SignUpForm 
          {...defaultProps} 
          prefillEmail="first@example.com"
        />,
        { wrapper: RouterWrapper }
      );
      
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('first@example.com');
      
      // Change prefillEmail prop
      rerender(
        <SignUpForm 
          {...defaultProps} 
          prefillEmail="second@example.com"
        />
      );
      
      await waitFor(() => {
        expect(emailInput).toHaveValue('second@example.com');
      });
    });

    it('should not update email if prefillEmail matches current email', () => {
      render(
        <SignUpForm 
          {...defaultProps} 
          prefillEmail="test@example.com"
        />,
        { wrapper: RouterWrapper }
      );
      
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('test@example.com');
      
      // User changes email manually using fireEvent
      fireEvent.change(emailInput, { target: { value: '' } });
      fireEvent.change(emailInput, { target: { value: 'manual@example.com' } });
      
      // Set prefillEmail back to test@example.com - should not update since different
      // Then set it to manual@example.com - should not trigger update since it matches
      render(
        <SignUpForm 
          {...defaultProps} 
          prefillEmail="manual@example.com"
        />,
        { wrapper: RouterWrapper }
      );
      
      const newEmailInput = screen.getByLabelText(/email/i);
      // Should still have the value (either from initial state or from manual input)
      expect(newEmailInput).toHaveValue('manual@example.com');
    });

    it('should validate email when prefillEmail changes to invalid value', async () => {
      const { rerender } = render(
        <SignUpForm 
          {...defaultProps} 
          prefillEmail=""
        />,
        { wrapper: RouterWrapper }
      );
      
      // Start with empty email
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('');
      
      // Change prefillEmail to invalid - this should trigger validation
      rerender(
        <SignUpForm 
          {...defaultProps} 
          prefillEmail="invalid-email"
        />
      );
      fireEvent.blur(emailInput);
      
      // Wait for email to be updated and error to appear
      await waitFor(() => {
        expect(emailInput).toHaveValue('invalid-email');
        const errorElement = document.getElementById('signup-email-error');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent('Enter a valid email address');
      });
    });

    it('should clear email error when prefillEmail changes to valid email', async () => {
      const { rerender } = render(
        <SignUpForm 
          {...defaultProps} 
          prefillEmail="invalid-email"
        />,
        { wrapper: RouterWrapper }
      );
      
      const emailInput = screen.getByLabelText(/email/i);
      
      // Wait for email to be set (may not have error initially if email matches)
      await waitFor(() => {
        expect(emailInput).toHaveValue('invalid-email');
      });
      
      // Change to a different invalid email first to trigger validation
      rerender(
        <SignUpForm 
          {...defaultProps} 
          prefillEmail="another-invalid"
        />
      );
      fireEvent.blur(emailInput);
      
      // Wait for error to appear
      await waitFor(() => {
        expect(emailInput).toHaveValue('another-invalid');
        const errorElement = document.getElementById('signup-email-error');
        expect(errorElement).toBeInTheDocument();
      });
      
      // Change to valid email
      rerender(
        <SignUpForm 
          {...defaultProps} 
          prefillEmail="valid@example.com"
        />
      );
      fireEvent.blur(emailInput);
      
      await waitFor(() => {
        expect(emailInput).toHaveValue('valid@example.com');
        // Error should be cleared
        expect(document.getElementById('signup-email-error')).not.toBeInTheDocument();
      });
    });

    it('should not update if prefillEmail is not provided', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('');
    });
  });

  describe('Invitation-based Signup', () => {
    it('should show info banner when invitedOrgName is provided', () => {
      withRouter(
        <SignUpForm 
          {...defaultProps} 
          invitedOrgName="Acme Corporation"
        />
      );
      
      expect(screen.getByText(/You'll join/i)).toBeInTheDocument();
      expect(screen.getByText(/Acme Corporation/i)).toBeInTheDocument();
      expect(screen.getByText(/choose a different name for your own workspace/i)).toBeInTheDocument();
    });

    it('should show error when organization name matches invited org name', async () => {
      withRouter(
        <SignUpForm 
          {...defaultProps} 
          invitedOrgName="Acme Corporation"
        />
      );
      
      const orgInput = screen.getByLabelText(/organization name/i);
      fireEvent.change(orgInput, { target: { value: 'Acme Corporation' } });
      fireEvent.blur(orgInput);
      
      await waitFor(() => {
        expect(screen.getByText(/Please choose a different name than "Acme Corporation"/i)).toBeInTheDocument();
      });
    });

    it('should show error for case-insensitive match', async () => {
      withRouter(
        <SignUpForm 
          {...defaultProps} 
          invitedOrgName="Acme Corporation"
        />
      );
      
      const orgInput = screen.getByLabelText(/organization name/i);
      fireEvent.change(orgInput, { target: { value: 'acme corporation' } });
      fireEvent.blur(orgInput);
      
      await waitFor(() => {
        const errorElement = document.getElementById('signup-org-error');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent(/Please choose a different name than "Acme Corporation"/i);
      });
    });

    it('should disable submit button when org name matches invited org', () => {
      withRouter(
        <SignUpForm 
          {...defaultProps} 
          invitedOrgName="Acme Corporation"
        />
      );
      
      // Fill all fields with matching org name
      fillFormFast({ organization: 'Acme Corporation' });
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit when org name is different from invited org', () => {
      withRouter(
        <SignUpForm 
          {...defaultProps} 
          invitedOrgName="Acme Corporation"
        />
      );
      
      // Fill all fields with different org name
      fillFormFast({ organization: 'My Company' });
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeEnabled();
    });

    it('should include invitation metadata in signUp call', async () => {
      withRouter(
        <SignUpForm 
          {...defaultProps} 
          invitedOrgId="org-123"
          invitedOrgName="Acme Corporation"
        />
      );
      
      // Fill all fields using fast helper
      fillFormFast({ organization: 'My Company' });
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'SecurePass1!',
          options: {
            emailRedirectTo: expect.any(String),
            data: {
              name: 'John Doe',
              organization_name: 'My Company',
              invited_organization_id: 'org-123',
              invited_organization_name: 'Acme Corporation',
              signup_source: 'invite'
            },
            captchaToken: 'mock-captcha-token'
          }
        });
      });
    });

    it('should update placeholder text when invited', () => {
      withRouter(
        <SignUpForm 
          {...defaultProps} 
          invitedOrgName="Acme Corporation"
        />
      );
      
      const orgInput = screen.getByLabelText(/organization name/i);
      expect(orgInput).toHaveAttribute('placeholder', 'Enter your organization name (not Acme Corporation)');
    });

    it('should not show banner when no invitation', () => {
      withRouter(<SignUpForm {...defaultProps} />);
      
      expect(screen.queryByText(/You'll join/i)).not.toBeInTheDocument();
    });
  });
});