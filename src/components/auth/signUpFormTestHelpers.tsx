import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import SignUpForm from './SignUpForm';
import * as authSignupService from '@/services/authSignupService';

export const mockSignUpWithEmail = vi.mocked(authSignupService.signUpWithEmail);
export const mockGetCurrentAuthSession = vi.mocked(authSignupService.getCurrentAuthSession);

export const defaultSignUpFormProps = {
  onSuccess: vi.fn(),
  onError: vi.fn(),
  isLoading: false,
  setIsLoading: vi.fn(),
};

export const withRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

export const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

export interface SignUpFormData {
  name?: string;
  email?: string;
  organization?: string;
  password?: string;
  confirmPassword?: string;
  verifyCaptcha?: boolean;
}

export const fillSignUpFormFast = (overrides: SignUpFormData = {}) => {
  const defaults: SignUpFormData = {
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
    fireEvent.change(screen.getByLabelText(/organization name/i), {
      target: { value: data.organization },
    });
  }
  if (data.password !== undefined) {
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: data.password } });
  }
  if (data.confirmPassword !== undefined) {
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: data.confirmPassword },
    });
  }
  fireEvent.click(screen.getByLabelText(/I have read and agree/i));
  if (data.verifyCaptcha) {
    fireEvent.click(screen.getByTestId('hcaptcha-success'));
  }
};

export function setupFastUser() {
  return userEvent.setup({ delay: null });
}

export function renderSignUpWithPasswordFields() {
  withRouter(<SignUpForm {...defaultSignUpFormProps} />);
  return {
    passwordInput: screen.getByLabelText('Password'),
    confirmPasswordInput: screen.getByLabelText(/confirm password/i),
  };
}

export function setupSignUpPasswordFields() {
  const user = setupFastUser();
  const fields = renderSignUpWithPasswordFields();
  return { user, ...fields };
}

export function setupSignUpFormBeforeEach(): void {
  vi.clearAllMocks();
  mockSignUpWithEmail.mockResolvedValue({
    error: null,
    data: {
      user: { id: 'u1' } as never,
      session: { access_token: 'test-access-token' } as never,
    },
  });
  mockGetCurrentAuthSession.mockResolvedValue({
    session: { access_token: 'test-access-token' } as never,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
      if (url.includes('record-terms-acceptance')) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response('not mocked', { status: 500 });
    }),
  );
}
