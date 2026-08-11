import { describe, expect, it } from 'vitest';
import {
  buildSignupUserMetadata,
  getSignupFieldError,
  isSignupFormValid,
  type SignUpValidationContext,
} from './signUpFormModel';

function baseContext(
  overrides: Partial<SignUpValidationContext> = {},
): SignUpValidationContext {
  return {
    formData: {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'SecurePass1!',
      confirmPassword: 'SecurePass1!',
      organizationName: 'Analytical Engines',
    },
    touched: {
      name: true,
      email: true,
      organizationName: true,
      password: true,
      confirmPassword: true,
    },
    emailError: null,
    orgNameError: null,
    passwordMatch: true,
    complexity: {
      valid: true,
      errors: [],
      hasMinLength: true,
      hasNumber: true,
      hasSymbol: true,
    },
    termsAccepted: true,
    acceptanceTouched: true,
    submitAttempted: false,
    hcaptchaEnabled: false,
    hcaptchaToken: null,
    ...overrides,
  };
}

describe('signUpFormModel name handling', () => {
  it('rejects empty and whitespace-only names with feedback', () => {
    expect(
      getSignupFieldError('name', baseContext({ formData: { ...baseContext().formData, name: '' } })),
    ).toBe('Full name is required');
    expect(
      getSignupFieldError(
        'name',
        baseContext({ formData: { ...baseContext().formData, name: '   ' } }),
      ),
    ).toBe('Full name is required');
  });

  it('treats whitespace-only names as invalid for submit', () => {
    expect(
      isSignupFormValid(
        baseContext({ formData: { ...baseContext().formData, name: '   ' } }),
      ),
    ).toBe(false);
  });

  it('trims name and organization in signup metadata', () => {
    const metadata = buildSignupUserMetadata(
      {
        name: '  Ada Lovelace  ',
        email: 'ada@example.com',
        password: 'SecurePass1!',
        confirmPassword: 'SecurePass1!',
        organizationName: '  Analytical Engines  ',
      },
      {},
    );

    expect(metadata.name).toBe('Ada Lovelace');
    expect(metadata.organization_name).toBe('Analytical Engines');
  });
});
