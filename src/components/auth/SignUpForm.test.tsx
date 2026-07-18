import './signUpFormTestSetup';

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import SignUpForm from './SignUpForm';
import { PRIVACY_VERSION_HASH, TERMS_VERSION_HASH } from '@/lib/legalPolicyVersions';
import type { AuthError } from '@supabase/supabase-js';
import {
  defaultSignUpFormProps,
  fillSignUpFormFast,
  mockSignUpWithEmail,
  RouterWrapper,
  setupFastUser,
  setupSignUpFormBeforeEach,
  setupSignUpPasswordFields,
  withRouter,
} from './signUpFormTestHelpers';

describe('SignUpForm', () => {
  beforeEach(() => {
    setupSignUpFormBeforeEach();
  });

  describe('Form Rendering', () => {
    it('should render all form fields correctly', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByTestId('hcaptcha-mock')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account & organization/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /retry saving legal acceptance/i })).not.toBeInTheDocument();
    });

    it('should have correct input types and attributes', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);

      expect(screen.getByLabelText(/full name/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText(/organization name/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('type', 'password');

      expect(screen.getByLabelText(/full name/i)).toBeRequired();
      expect(screen.getByLabelText(/email/i)).toBeRequired();
      expect(screen.getByLabelText(/organization name/i)).toBeRequired();
      expect(screen.getByLabelText('Password')).toBeRequired();
      expect(screen.getByLabelText(/confirm password/i)).toBeRequired();
    });

    it('should have organization name placeholder', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);

      expect(screen.getByLabelText(/organization name/i)).toHaveAttribute(
        'placeholder',
        'Enter your organization name',
      );
    });
  });

  describe('Input Handling', () => {
    it('should update form data when inputs change', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);

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
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);

      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      fireEvent.change(passwordInput, { target: { value: 'SecurePass1!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'SecurePass1!' } });

      expect(passwordInput).toHaveValue('SecurePass1!');
      expect(confirmPasswordInput).toHaveValue('SecurePass1!');
    });
  });

  describe('Password Validation', () => {
    it('should show password length validation error', async () => {
      const { user, passwordInput } = setupSignUpPasswordFields();
      await user.type(passwordInput, '123');
      fireEvent.blur(passwordInput);

      const fieldRoot = passwordInput.closest('div.space-y-2');
      const inlineError = fieldRoot?.querySelector('p.text-destructive');
      expect(inlineError).toBeTruthy();
      expect(inlineError).toHaveTextContent(/At least 12 characters/i);
    });

    it('should not show password length error for valid password', async () => {
      const { user, passwordInput } = setupSignUpPasswordFields();
      await user.type(passwordInput, 'SecurePass1!');

      const fieldRoot = passwordInput.closest('div.space-y-2');
      expect(fieldRoot?.querySelector('p.text-destructive')).toBeNull();
    });

    it('should show password match validation in real-time', async () => {
      const { user, passwordInput, confirmPasswordInput } = setupSignUpPasswordFields();
      await user.type(passwordInput, 'SecurePass1!');
      await user.type(confirmPasswordInput, 'SecurePass2!');

      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      expect(screen.getByTestId('password-match-error')).toBeInTheDocument();
    });

    it('should show success icon when passwords match', async () => {
      const { user, passwordInput, confirmPasswordInput } = setupSignUpPasswordFields();
      await user.type(passwordInput, 'SecurePass1!');
      await user.type(confirmPasswordInput, 'SecurePass1!');

      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('password-match-success')).toBeInTheDocument();
    });

    it('should validate password match when changing password field', async () => {
      const { user, passwordInput, confirmPasswordInput } = setupSignUpPasswordFields();
      await user.type(confirmPasswordInput, 'SecurePass1!');
      await user.type(passwordInput, 'Different1!');

      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    it('should clear password match indicator when confirm password is empty', async () => {
      const { user, passwordInput, confirmPasswordInput } = setupSignUpPasswordFields();
      await user.type(passwordInput, 'SecurePass1!');
      await user.type(confirmPasswordInput, 'SecurePass1!');
      await user.clear(confirmPasswordInput);

      expect(screen.queryByTestId('password-match-success')).not.toBeInTheDocument();
      expect(screen.queryByTestId('password-match-error')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when form is invalid', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);

      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when form is valid', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);
      fillSignUpFormFast();

      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeEnabled();
    });

    it('should require all fields to be valid', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);

      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      fillSignUpFormFast({ organization: '', password: '', confirmPassword: '', verifyCaptcha: false });

      expect(submitButton).toBeDisabled();
    });

    it('should disable submit when password does not meet complexity', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);
      fillSignUpFormFast({ password: 'ab', confirmPassword: 'ab' });

      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeDisabled();
    });

    it('should require passwords to match', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);
      fillSignUpFormFast({ confirmPassword: 'SecurePass2!' });

      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeDisabled();
    });

    it('should require captcha verification', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);
      fillSignUpFormFast({ verifyCaptcha: false });

      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('HCaptcha Integration', () => {
    it('should enable form submission after captcha verification', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);
      fillSignUpFormFast();

      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeEnabled();
    });

    it('should handle captcha error', () => {
      const onError = vi.fn();
      withRouter(<SignUpForm {...defaultSignUpFormProps} onError={onError} />);

      fireEvent.click(screen.getByTestId('hcaptcha-error'));

      expect(onError).toHaveBeenCalledWith('CAPTCHA verification failed. Please try again.');
    });

    it('should handle captcha expiration', () => {
      const onError = vi.fn();
      withRouter(<SignUpForm {...defaultSignUpFormProps} onError={onError} />);

      fireEvent.click(screen.getByTestId('hcaptcha-expire'));

      expect(onError).toHaveBeenCalledWith('CAPTCHA expired. Please complete it again.');
    });
  });

  describe('Form Submission', () => {
    it('should submit form with correct data', async () => {
      const onSuccess = vi.fn();
      withRouter(<SignUpForm {...defaultSignUpFormProps} onSuccess={onSuccess} />);

      fillSignUpFormFast({ organization: 'Test Organization' });
      fireEvent.click(screen.getByRole('button', { name: /create account & organization/i }));

      await waitFor(() => {
        expect(mockSignUpWithEmail).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'SecurePass1!',
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: 'John Doe',
            organization_name: 'Test Organization',
            terms_accepted: 'true',
            terms_version_hash: TERMS_VERSION_HASH,
            privacy_version_hash: PRIVACY_VERSION_HASH,
            terms_accepted_at: expect.any(String),
          },
          captchaToken: 'mock-captcha-token',
        });
      });

      expect(onSuccess).toHaveBeenCalledWith(
        'Account created successfully! Please check your email to verify your account and complete organization setup.',
        'john@example.com',
      );
    });

    it('should handle submission with incomplete form', async () => {
      const onError = vi.fn();
      withRouter(<SignUpForm {...defaultSignUpFormProps} onError={onError} />);

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
      expect(mockSignUpWithEmail).not.toHaveBeenCalled();
    });

    it('should handle Supabase signup error', async () => {
      const onError = vi.fn();
      const setIsLoading = vi.fn();

      mockSignUpWithEmail.mockResolvedValue({
        error: {
          message: 'Email already registered',
          code: 'user_already_exists',
          status: 400,
          name: 'AuthError',
        } as AuthError,
        data: { user: null, session: null },
      });

      withRouter(<SignUpForm {...defaultSignUpFormProps} onError={onError} setIsLoading={setIsLoading} />);
      fillSignUpFormFast();
      fireEvent.click(screen.getByRole('button', { name: /create account & organization/i }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Email already registered');
        expect(setIsLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should handle unexpected errors', async () => {
      const onError = vi.fn();
      const setIsLoading = vi.fn();

      mockSignUpWithEmail.mockRejectedValue(new Error('Network error'));

      withRouter(<SignUpForm {...defaultSignUpFormProps} onError={onError} setIsLoading={setIsLoading} />);
      fillSignUpFormFast();
      fireEvent.click(screen.getByRole('button', { name: /create account & organization/i }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Network error');
        expect(setIsLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should manage loading state during submission', async () => {
      const setIsLoading = vi.fn();

      mockSignUpWithEmail.mockResolvedValue({ error: null, data: { user: null, session: null } });

      withRouter(<SignUpForm {...defaultSignUpFormProps} setIsLoading={setIsLoading} />);
      fillSignUpFormFast();
      fireEvent.click(screen.getByRole('button', { name: /create account & organization/i }));

      expect(setIsLoading).toHaveBeenCalledWith(true);

      await waitFor(() => {
        expect(setIsLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should reset captcha token on error', async () => {
      mockSignUpWithEmail.mockResolvedValue({
        error: {
          message: 'Signup failed',
          code: 'signup_error',
          status: 400,
          name: 'AuthError',
        } as AuthError,
        data: { user: null, session: null },
      });

      withRouter(<SignUpForm {...defaultSignUpFormProps} />);
      fillSignUpFormFast();

      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeEnabled();
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} isLoading={true} />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account & organization/i })).toBeDisabled();
    });

    it('should not show loading spinner when isLoading is false', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} isLoading={false} />);

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('should prevent multiple rapid submissions', async () => {
      const setIsLoading = vi.fn();
      type SignUpResolution = { error: null; data: { user: null; session: null } };
      let resolveSignUp!: (value: SignUpResolution) => void;

      mockSignUpWithEmail.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSignUp = resolve;
          }),
      );

      const TestWrapper = () => {
        const [isLoading, setIsLoadingState] = React.useState(false);

        return (
          <RouterWrapper>
            <SignUpForm
              {...defaultSignUpFormProps}
              isLoading={isLoading}
              setIsLoading={(loading: boolean) => {
                setIsLoadingState(loading);
                setIsLoading(loading);
              }}
            />
          </RouterWrapper>
        );
      };

      render(<TestWrapper />);
      fillSignUpFormFast();

      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      expect(mockSignUpWithEmail).toHaveBeenCalledTimes(1);

      resolveSignUp({
        error: null,
        data: { user: null, session: { access_token: 'tok' } as never },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long input values', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);

      const longString = 'a'.repeat(200);
      const nameInput = screen.getByLabelText(/full name/i);

      fireEvent.change(nameInput, { target: { value: longString } });
      expect(nameInput).toHaveValue(longString);
    });

    it('should handle special characters in organization name', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);

      const orgInput = screen.getByLabelText(/organization name/i);
      const specialString = 'Test Org & Co. - "Best Company" #1!';

      fireEvent.change(orgInput, { target: { value: specialString } });
      expect(orgInput).toHaveValue(specialString);
    });

    it('should handle non-Error exceptions', async () => {
      const onError = vi.fn();

      mockSignUpWithEmail.mockRejectedValue('String error');

      withRouter(<SignUpForm {...defaultSignUpFormProps} onError={onError} />);
      fillSignUpFormFast();
      fireEvent.click(screen.getByRole('button', { name: /create account & organization/i }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('An error occurred during sign up');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper label associations', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);

      expect(screen.getByLabelText(/full name/i)).toHaveAttribute('id', 'signup-name');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('id', 'signup-email');
      expect(screen.getByLabelText(/organization name/i)).toHaveAttribute('id', 'signup-organization');
      expect(screen.getByLabelText('Password')).toHaveAttribute('id', 'signup-password');
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('id', 'signup-confirm-password');
    });

    it('should support keyboard navigation', async () => {
      const user = setupFastUser();
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);

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
      render(<SignUpForm {...defaultSignUpFormProps} prefillEmail="prefilled@example.com" />, {
        wrapper: RouterWrapper,
      });

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('prefilled@example.com');
    });

    it('should update email when prefillEmail prop changes', async () => {
      const { rerender } = render(<SignUpForm {...defaultSignUpFormProps} prefillEmail="first@example.com" />, {
        wrapper: RouterWrapper,
      });

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('first@example.com');

      rerender(<SignUpForm {...defaultSignUpFormProps} prefillEmail="second@example.com" />);

      await waitFor(() => {
        expect(emailInput).toHaveValue('second@example.com');
      });
    });

    it('should not update email if prefillEmail matches current email', () => {
      const { unmount } = render(
        <SignUpForm {...defaultSignUpFormProps} prefillEmail="test@example.com" />,
        {
          wrapper: RouterWrapper,
        },
      );

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('test@example.com');

      fireEvent.change(emailInput, { target: { value: '' } });
      fireEvent.change(emailInput, { target: { value: 'manual@example.com' } });

      // Unmount before remounting — a second render() without cleanup stacks trees in happy-dom.
      unmount();
      render(<SignUpForm {...defaultSignUpFormProps} prefillEmail="manual@example.com" />, {
        wrapper: RouterWrapper,
      });

      expect(screen.getByLabelText(/email/i)).toHaveValue('manual@example.com');
    });

    it('should validate email when prefillEmail changes to invalid value', async () => {
      const { rerender } = render(<SignUpForm {...defaultSignUpFormProps} prefillEmail="" />, {
        wrapper: RouterWrapper,
      });

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('');

      rerender(<SignUpForm {...defaultSignUpFormProps} prefillEmail="invalid-email" />);
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(emailInput).toHaveValue('invalid-email');
        const errorElement = document.getElementById('signup-email-error');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent('Enter a valid email address');
      });
    });

    it('should clear email error when prefillEmail changes to valid email', async () => {
      const { rerender } = render(<SignUpForm {...defaultSignUpFormProps} prefillEmail="invalid-email" />, {
        wrapper: RouterWrapper,
      });

      const emailInput = screen.getByLabelText(/email/i);

      await waitFor(() => {
        expect(emailInput).toHaveValue('invalid-email');
      });

      rerender(<SignUpForm {...defaultSignUpFormProps} prefillEmail="another-invalid" />);
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(emailInput).toHaveValue('another-invalid');
        const errorElement = document.getElementById('signup-email-error');
        expect(errorElement).toBeInTheDocument();
      });

      rerender(<SignUpForm {...defaultSignUpFormProps} prefillEmail="valid@example.com" />);
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(emailInput).toHaveValue('valid@example.com');
        expect(document.getElementById('signup-email-error')).not.toBeInTheDocument();
      });
    });

    it('should not update if prefillEmail is not provided', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('');
    });
  });

  describe('Invitation-based Signup', () => {
    it('should show info banner when invitedOrgName is provided', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} invitedOrgName="Acme Corporation" />);

      expect(screen.getByText(/You'll join/i)).toBeInTheDocument();
      expect(screen.getByText(/Acme Corporation/i)).toBeInTheDocument();
      expect(screen.getByText(/choose a different name for your own workspace/i)).toBeInTheDocument();
    });

    it('should show error when organization name matches invited org name', async () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} invitedOrgName="Acme Corporation" />);

      const orgInput = screen.getByLabelText(/organization name/i);
      fireEvent.change(orgInput, { target: { value: 'Acme Corporation' } });
      fireEvent.blur(orgInput);

      await waitFor(() => {
        expect(screen.getByText(/Please choose a different name than "Acme Corporation"/i)).toBeInTheDocument();
      });
    });

    it('should show error for case-insensitive match', async () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} invitedOrgName="Acme Corporation" />);

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
      withRouter(<SignUpForm {...defaultSignUpFormProps} invitedOrgName="Acme Corporation" />);
      fillSignUpFormFast({ organization: 'Acme Corporation' });

      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit when org name is different from invited org', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} invitedOrgName="Acme Corporation" />);
      fillSignUpFormFast({ organization: 'My Company' });

      const submitButton = screen.getByRole('button', { name: /create account & organization/i });
      expect(submitButton).toBeEnabled();
    });

    it('should include invitation metadata in signUp call', async () => {
      withRouter(
        <SignUpForm
          {...defaultSignUpFormProps}
          invitedOrgId="org-123"
          invitedOrgName="Acme Corporation"
        />,
      );

      fillSignUpFormFast({ organization: 'My Company' });
      fireEvent.click(screen.getByRole('button', { name: /create account & organization/i }));

      await waitFor(() => {
        expect(mockSignUpWithEmail).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'SecurePass1!',
          emailRedirectTo: expect.any(String),
          data: {
            name: 'John Doe',
            organization_name: 'My Company',
            invited_organization_id: 'org-123',
            invited_organization_name: 'Acme Corporation',
            signup_source: 'invite',
            terms_accepted: 'true',
            terms_version_hash: TERMS_VERSION_HASH,
            privacy_version_hash: PRIVACY_VERSION_HASH,
            terms_accepted_at: expect.any(String),
          },
          captchaToken: 'mock-captcha-token',
        });
      });
    });

    it('should update placeholder text when invited', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} invitedOrgName="Acme Corporation" />);

      const orgInput = screen.getByLabelText(/organization name/i);
      expect(orgInput).toHaveAttribute('placeholder', 'Enter your organization name (not Acme Corporation)');
    });

    it('should not show banner when no invitation', () => {
      withRouter(<SignUpForm {...defaultSignUpFormProps} />);

      expect(screen.queryByText(/You'll join/i)).not.toBeInTheDocument();
    });
  });
});
