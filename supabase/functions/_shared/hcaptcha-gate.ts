/**
 * Fail-closed captcha gate for public endpoints.
 *
 * When HCAPTCHA_SECRET_KEY is present (preview/prod), captcha is required.
 * Local/dev without a secret skips captcha so E2E can run; callers must still
 * enforce throttle / idempotency.
 */
export function isCaptchaEnforced(secretKey: string | null | undefined): boolean {
  return Boolean(secretKey && secretKey.trim().length > 0);
}
