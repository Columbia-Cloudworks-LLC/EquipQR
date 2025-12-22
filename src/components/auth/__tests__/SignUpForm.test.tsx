import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SignUpForm from '../SignUpForm';

import { supabase } from '@/integrations/supabase/client';
import type { AuthError } from '@supabase/supabase-js';

// Mock environment variable for hCaptcha
vi.stubEnv('VITE_HCAPTCHA_SITEKEY', 'test-hcaptcha-site-key');

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn()
    }
  }
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

describe('SignUpForm', () => {
  const defaultProps = {
    onSuccess: vi.fn(),
    onError: vi.fn(),
    isLoading: false,
    setIsLoading: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockResolvedValue({ error: null, data: { user: null, session: null } });
  });

  describe('Form Rendering', () => {
    it('should render all form fields correctly', () => {
      render(<SignUpForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByTestId('hcaptcha-mock')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account & organization/i })).toBeInTheDocument();
    });

    it('should have correct input types and attributes', () => {
      render(<SignUpForm {...defaultProps} />);
      
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
      render(<SignUpForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/organization name/i)).toHaveAttribute(
        'placeholder', 
        'Enter your organization name'
      );
    });
  });

  describe('Input Handling', () => {
    it('should update form data when inputs change', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const orgInput = screen.getByLabelText(/organization name/i);
      
      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(orgInput, 'Test Organization');
      
      expect(nameInput).toHaveValue('John Doe');
      expect(emailInput).toHaveValue('john@example.com');
      expect(orgInput).toHaveValue('Test Organization');
    });

    it('should handle password input changes', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      
      expect(passwordInput).toHaveValue('password123');
      expect(confirmPasswordInput).toHaveValue('password123');
    });
  });

  describe('Password Validation', () => {
    it('should show password length validation error', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, '123');
      
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
    });

    it('should not show password length error for valid password', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'password123');
      
      expect(screen.queryByText(/password must be at least 6 characters/i)).not.toBeInTheDocument();
    });

    it('should show password match validation in real-time', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password456');
      
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      expect(screen.getByTestId('password-match-error')).toBeInTheDocument();
    });

    it('should show success icon when passwords match', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      
      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('password-match-success')).toBeInTheDocument();
    });

    it('should validate password match when changing password field', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      // Set confirm password first
      await user.type(confirmPasswordInput, 'password123');
      // Then set password that doesn't match
      await user.type(passwordInput, 'different');
      
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    it('should clear password match indicator when confirm password is empty', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);
      
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      
      // Clear confirm password
      await user.clear(confirmPasswordInput);
      
      expect(screen.queryByTestId('password-match-success')).not.toBeInTheDocument();
      expect(screen.queryByTestId('password-match-error')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when form is invalid', () => {
      render(<SignUpForm {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when form is valid', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);
      
      // Fill all required fields
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      // Verify captcha
      await user.click(screen.getByTestId('hcaptcha-success'));
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeEnabled();
    });

    it('should require all fields to be valid', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      
      // Fill some fields but not all
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      // Missing organization name, password, confirm password, and captcha
      
      expect(submitButton).toBeDisabled();
    });

    it('should require password to be at least 6 characters', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);
      
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org');
      await user.type(screen.getByLabelText('Password'), '123'); // Too short
      await user.type(screen.getByLabelText(/confirm password/i), '123');
      await user.click(screen.getByTestId('hcaptcha-success'));
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeDisabled();
    });

    it('should require passwords to match', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);
      
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'different');
      await user.click(screen.getByTestId('hcaptcha-success'));
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeDisabled();
    });

    it('should require captcha verification', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);
      
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      // Don't verify captcha
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('HCaptcha Integration', () => {
    it('should enable form submission after captcha verification', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);
      
      // Fill form
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      
      // Verify captcha
      await user.click(screen.getByTestId('hcaptcha-success'));
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeEnabled();
    });

    it('should handle captcha error', async () => {
      const user = userEvent.setup();
      const onError = vi.fn();
      render(<SignUpForm {...defaultProps} onError={onError} />);
      
      await user.click(screen.getByTestId('hcaptcha-error'));
      
      expect(onError).toHaveBeenCalledWith('CAPTCHA verification failed. Please try again.');
    });

    it('should handle captcha expiration', async () => {
      const user = userEvent.setup();
      const onError = vi.fn();
      render(<SignUpForm {...defaultProps} onError={onError} />);
      
      await user.click(screen.getByTestId('hcaptcha-expire'));
      
      expect(onError).toHaveBeenCalledWith('CAPTCHA expired. Please complete it again.');
    });
  });

  describe('Form Submission', () => {
    it('should submit form with correct data', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<SignUpForm {...defaultProps} onSuccess={onSuccess} />);
      
      // Fill form
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/organization name/i), 'Test Organization');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByTestId('hcaptcha-success'));
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /create account & organization/i }));
      
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'password123',
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
      render(<SignUpForm {...defaultProps} onError={onError} />);
      
      // Try to submit without filling form (this shouldn't happen due to disabled button, but test anyway)
      const form = screen.getByRole('button', { name: /create account & organization/i }).closest('form');
      
      await act(async () => {
        if (form) {
          const event = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(event);
        }
      });
      
      expect(onError).toHaveBeenCalledWith('Please fill in all fields correctly');
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('should handle Supabase signup error', async () => {
      const user = userEvent.setup();
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
      
      render(<SignUpForm {...defaultProps} onError={onError} setIsLoading={setIsLoading} />);
      
      // Fill form
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByTestId('hcaptcha-success'));
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /create account & organization/i }));
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Email already registered');
        expect(setIsLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should handle unexpected errors', async () => {
      const user = userEvent.setup();
      const onError = vi.fn();
      const setIsLoading = vi.fn();
      
      mockSignUp.mockRejectedValue(new Error('Network error'));
      
      render(<SignUpForm {...defaultProps} onError={onError} setIsLoading={setIsLoading} />);
      
      // Fill form
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByTestId('hcaptcha-success'));
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /create account & organization/i }));
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Network error');
        expect(setIsLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should manage loading state during submission', async () => {
      const user = userEvent.setup();
      const setIsLoading = vi.fn();
      
      // Mock signUp with delay to test loading state
      mockSignUp.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ error: null, data: { user: null, session: null } }), 50)
        )
      );
      
      render(<SignUpForm {...defaultProps} setIsLoading={setIsLoading} />);
      
      // Fill form
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByTestId('hcaptcha-success'));
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /create account & organization/i }));
      
      expect(setIsLoading).toHaveBeenCalledWith(true);
      
      await waitFor(() => {
        expect(setIsLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should reset captcha token on error', async () => {
      const user = userEvent.setup();
      
      mockSignUp.mockResolvedValue({ 
        error: {
          message: 'Signup failed',
          code: 'signup_error',
          status: 400,
          name: 'AuthError'
        } as AuthError,
        data: { user: null, session: null } 
      });
      
      render(<SignUpForm {...defaultProps} />);
      
      // Fill form and verify captcha
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByTestId('hcaptcha-success'));
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeEnabled();
      
      // Submit form (will fail)
      await user.click(submitButton);
      
      await waitFor(() => {
        // Form should be disabled again because captcha token was reset
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(<SignUpForm {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account & organization/i })).toBeDisabled();
    });

    it('should not show loading spinner when isLoading is false', () => {
      render(<SignUpForm {...defaultProps} isLoading={false} />);
      
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('should prevent multiple rapid submissions', async () => {
      const user = userEvent.setup();
      const setIsLoading = vi.fn();
      type SignUpResolution = { error: null; data: { user: null; session: null } };
      let resolveSignUp: (value: SignUpResolution) => void = () => {};
      
      // Mock signUp with a controlled promise that doesn't resolve immediately
      mockSignUp.mockImplementation(() => 
        new Promise(resolve => {
          resolveSignUp = resolve;
        })
      );
      
      const TestWrapper = () => {
        const [isLoading, setIsLoadingState] = React.useState(false);
        
        return (
          <SignUpForm 
            {...defaultProps} 
            isLoading={isLoading} 
            setIsLoading={(loading: boolean) => {
              setIsLoadingState(loading);
              setIsLoading(loading);
            }} 
          />
        );
      };
      
      render(<TestWrapper />);
      
      // Fill form
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByTestId('hcaptcha-success'));
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      
      // Fire first click - this starts the submission
      await user.click(submitButton);
      
      // Wait for the button to be disabled (loading state active)
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
      
      // Now attempt additional clicks while button is disabled
      // These should NOT trigger additional submissions
      await user.click(submitButton).catch(() => {/* button is disabled */});
      await user.click(submitButton).catch(() => {/* button is disabled */});
      await user.click(submitButton).catch(() => {/* button is disabled */});
      
      // Verify only ONE call was made despite multiple click attempts
      expect(mockSignUp).toHaveBeenCalledTimes(1);
      
      // Resolve the promise to clean up
      resolveSignUp({ error: null, data: { user: null, session: null } });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long input values', async () => {
      render(<SignUpForm {...defaultProps} />);
      
      const longString = 'a'.repeat(200);
      const nameInput = screen.getByLabelText(/full name/i);
      
      fireEvent.change(nameInput, { target: { value: longString } });
      expect(nameInput).toHaveValue(longString);
    });

    it('should handle special characters in organization name', async () => {
      render(<SignUpForm {...defaultProps} />);
      
      const orgInput = screen.getByLabelText(/organization name/i);
      const specialString = 'Test Org & Co. - "Best Company" #1!';
      
      fireEvent.change(orgInput, { target: { value: specialString } });
      expect(orgInput).toHaveValue(specialString);
    });

    it('should handle non-Error exceptions', async () => {
      const user = userEvent.setup();
      const onError = vi.fn();
      
      mockSignUp.mockRejectedValue('String error');
      
      render(<SignUpForm {...defaultProps} onError={onError} />);
      
      // Fill and submit form
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/organization name/i), 'Test Org');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByTestId('hcaptcha-success'));
      await user.click(screen.getByRole('button', { name: /create account & organization/i }));
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('An error occurred during sign up');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper label associations', () => {
      render(<SignUpForm {...defaultProps} />);
      
      expect(screen.getByLabelText(/full name/i)).toHaveAttribute('id', 'signup-name');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('id', 'signup-email');
      expect(screen.getByLabelText(/organization name/i)).toHaveAttribute('id', 'signup-organization');
      expect(screen.getByLabelText('Password')).toHaveAttribute('id', 'signup-password');
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('id', 'signup-confirm-password');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<SignUpForm {...defaultProps} />);
      
      // Tab through form fields
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
        />
      );
      
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('prefilled@example.com');
    });

    it('should update email when prefillEmail prop changes', async () => {
      const { rerender } = render(
        <SignUpForm 
          {...defaultProps} 
          prefillEmail="first@example.com"
        />
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

    it('should not update email if prefillEmail matches current email', async () => {
      const user = userEvent.setup();
      render(
        <SignUpForm 
          {...defaultProps} 
          prefillEmail="test@example.com"
        />
      );
      
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('test@example.com');
      
      // User changes email manually
      await user.clear(emailInput);
      await user.type(emailInput, 'manual@example.com');
      
      // Set prefillEmail back to test@example.com - should not update since different
      // Then set it to manual@example.com - should not trigger update since it matches
      render(
        <SignUpForm 
          {...defaultProps} 
          prefillEmail="manual@example.com"
        />
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
        />
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
        />
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
      
      await waitFor(() => {
        expect(emailInput).toHaveValue('valid@example.com');
        // Error should be cleared
        expect(document.getElementById('signup-email-error')).not.toBeInTheDocument();
      });
    });

    it('should not update if prefillEmail is not provided', () => {
      render(<SignUpForm {...defaultProps} />);
      
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('');
    });
  });

  describe('Invitation-based Signup', () => {
    it('should show info banner when invitedOrgName is provided', () => {
      render(
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
      const user = userEvent.setup();
      render(
        <SignUpForm 
          {...defaultProps} 
          invitedOrgName="Acme Corporation"
        />
      );
      
      const orgInput = screen.getByLabelText(/organization name/i);
      await user.type(orgInput, 'Acme Corporation');
      
      await waitFor(() => {
        expect(screen.getByText(/Please choose a different name than "Acme Corporation"/i)).toBeInTheDocument();
      });
    });

    it('should show error for case-insensitive match', async () => {
      const user = userEvent.setup();
      render(
        <SignUpForm 
          {...defaultProps} 
          invitedOrgName="Acme Corporation"
        />
      );
      
      const orgInput = screen.getByLabelText(/organization name/i);
      await user.type(orgInput, 'acme corporation');
      
      await waitFor(() => {
        const errorElement = document.getElementById('signup-org-error');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent(/Please choose a different name than "Acme Corporation"/i);
      });
    });

    it('should disable submit button when org name matches invited org', async () => {
      const user = userEvent.setup();
      render(
        <SignUpForm 
          {...defaultProps} 
          invitedOrgName="Acme Corporation"
        />
      );
      
      // Fill all fields
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/organization name/i), 'Acme Corporation');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByTestId('hcaptcha-success'));
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeDisabled();
    }, 10000);

    it('should enable submit when org name is different from invited org', async () => {
      const user = userEvent.setup();
      render(
        <SignUpForm 
          {...defaultProps} 
          invitedOrgName="Acme Corporation"
        />
      );
      
      // Fill all fields with different org name
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/organization name/i), 'My Company');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByTestId('hcaptcha-success'));
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeEnabled();
    });

    it('should include invitation metadata in signUp call', async () => {
      const user = userEvent.setup();
      render(
        <SignUpForm 
          {...defaultProps} 
          invitedOrgId="org-123"
          invitedOrgName="Acme Corporation"
        />
      );
      
      // Fill all fields
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/organization name/i), 'My Company');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByTestId('hcaptcha-success'));
      
      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'password123',
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
    }, 10000);

    it('should update placeholder text when invited', () => {
      render(
        <SignUpForm 
          {...defaultProps} 
          invitedOrgName="Acme Corporation"
        />
      );
      
      const orgInput = screen.getByLabelText(/organization name/i);
      expect(orgInput).toHaveAttribute('placeholder', 'Enter your organization name (not Acme Corporation)');
    });

    it('should not show banner when no invitation', () => {
      render(<SignUpForm {...defaultProps} />);
      
      expect(screen.queryByText(/You'll join/i)).not.toBeInTheDocument();
    });
  });
});