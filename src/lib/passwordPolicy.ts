/**
 * Shared password policy for signup / future flows.
 */

export const PASSWORD_POLICY = {
  minLength: 12,
  requireNumber: true,
  requireSymbol: true,
} as const;

const SYMBOL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export interface PasswordComplexityResult {
  valid: boolean;
  errors: string[];
  hasMinLength: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

export function validatePasswordComplexity(password: string): PasswordComplexityResult {
  const errors: string[] = [];
  const hasMinLength = password.length >= PASSWORD_POLICY.minLength;
  const hasNumber = /\d/.test(password);
  const hasSymbol = SYMBOL_RE.test(password);

  if (!hasMinLength) {
    errors.push(`At least ${PASSWORD_POLICY.minLength} characters`);
  }
  if (PASSWORD_POLICY.requireNumber && !hasNumber) {
    errors.push('At least one number');
  }
  if (PASSWORD_POLICY.requireSymbol && !hasSymbol) {
    errors.push('At least one symbol (!@#$…)');
  }

  return {
    valid: errors.length === 0,
    errors,
    hasMinLength,
    hasNumber,
    hasSymbol,
  };
}

/** 0 = empty/very weak … 4 = meets all complexity bars with reasonable length */
export function calculatePasswordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  const c = validatePasswordComplexity(password);
  let score = 0;
  if (password.length >= 8) score++;
  if (c.hasMinLength) score++;
  if (c.hasNumber) score++;
  if (c.hasSymbol) score++;
  if (password.length >= 16 && c.valid) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

/** Uppercase SHA-1 hex for HIBP k-anonymity range checks */
export async function hashPasswordSha1Hex(password: string): Promise<string> {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-1', enc);
  const hex = Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.toUpperCase();
}
