import { PRIVACY_VERSION_HASH, TERMS_VERSION_HASH } from '@/lib/legalPolicyVersions';
import type { PasswordComplexityResult } from '@/lib/passwordPolicy';

export const SIGNUP_EMAIL_REGEX = /[^\s@]+@[^\s@]+\.[^\s@]+/;

export const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'] as const;

export type SignUpFormFields = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  organizationName: string;
};

export type SignUpValidationContext = {
  formData: SignUpFormFields;
  touched: Record<string, boolean>;
  emailError: string | null;
  orgNameError: string | null;
  passwordMatch: boolean | null;
  complexity: PasswordComplexityResult;
  termsAccepted: boolean;
  acceptanceTouched: boolean;
  submitAttempted: boolean;
  hcaptchaEnabled: boolean;
  hcaptchaToken: string | null;
};

export function isSignupEmailValid(email: string): boolean {
  return SIGNUP_EMAIL_REGEX.test(email);
}

export function getEmailErrorForValue(value: string): string | null {
  return isSignupEmailValid(value) || value.length === 0 ? null : 'Enter a valid email address';
}

export function getInvitedOrgNameConflict(
  orgName: string,
  invitedOrgName: string | undefined,
): string | null {
  if (!invitedOrgName) return null;
  if (orgName.trim().toLowerCase() === invitedOrgName.trim().toLowerCase()) {
    return `Please choose a different name than "${invitedOrgName}"`;
  }
  return null;
}

export function computePasswordMatch(
  password: string,
  confirmPassword: string,
  changedField: string,
  prevPassword: string,
  prevConfirmPassword: string,
): boolean | null {
  const newPassword = changedField === 'password' ? password : prevPassword;
  const newConfirmPassword = changedField === 'confirmPassword' ? confirmPassword : prevConfirmPassword;

  if (newConfirmPassword) {
    return newPassword === newConfirmPassword;
  }
  return null;
}

export function getSignupFieldError(field: string, ctx: SignUpValidationContext): string | null {
  if (!ctx.touched[field]) return null;
  switch (field) {
    case 'name':
      return !ctx.formData.name.trim() ? 'Full name is required' : null;
    case 'email':
      if (!ctx.formData.email.trim()) return 'Email is required';
      return ctx.emailError;
    case 'organizationName':
      if (ctx.orgNameError) return ctx.orgNameError;
      return !ctx.formData.organizationName.trim() ? 'Organization name is required' : null;
    case 'password':
      if (!ctx.formData.password) return 'Password is required';
      return ctx.complexity.valid
        ? null
        : ctx.complexity.errors[0] ?? 'Password does not meet requirements';
    case 'confirmPassword':
      if (!ctx.formData.confirmPassword) return 'Please confirm your password';
      return ctx.passwordMatch === false ? 'Passwords do not match' : null;
    default:
      return null;
  }
}

export function getSignupAcceptanceError(
  termsAccepted: boolean,
  acceptanceTouched: boolean,
  submitAttempted: boolean,
): string | null {
  if (!acceptanceTouched && !submitAttempted) return null;
  return termsAccepted ? null : 'You must accept the Terms of Service and Privacy Policy';
}

export function isSignupFormValid(ctx: SignUpValidationContext): boolean {
  const baseValid =
    ctx.formData.name.trim() &&
    ctx.formData.email.trim() &&
    ctx.complexity.valid &&
    ctx.formData.confirmPassword &&
    ctx.formData.organizationName.trim() &&
    ctx.passwordMatch === true &&
    !ctx.orgNameError &&
    ctx.termsAccepted;

  return ctx.hcaptchaEnabled ? Boolean(baseValid && ctx.hcaptchaToken) : Boolean(baseValid);
}

export function buildSignupUserMetadata(
  formData: SignUpFormFields,
  options: { invitedOrgId?: string; invitedOrgName?: string },
): Record<string, string> {
  const signUpData: Record<string, string> = {
    name: formData.name.trim(),
    organization_name: formData.organizationName.trim(),
  };

  if (options.invitedOrgId) {
    signUpData.invited_organization_id = options.invitedOrgId;
  }
  if (options.invitedOrgName) {
    signUpData.invited_organization_name = options.invitedOrgName;
  }
  if (options.invitedOrgId || options.invitedOrgName) {
    signUpData.signup_source = 'invite';
  }

  signUpData.terms_accepted = 'true';
  signUpData.terms_version_hash = TERMS_VERSION_HASH;
  signUpData.privacy_version_hash = PRIVACY_VERSION_HASH;
  signUpData.terms_accepted_at = new Date().toISOString();

  return signUpData;
}

export const ALL_SIGNUP_FIELDS_TOUCHED: Record<string, boolean> = {
  name: true,
  email: true,
  organizationName: true,
  password: true,
  confirmPassword: true,
};
