import { optionalSecret } from "./require-secret.ts";

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

/**
 * Verify an hCaptcha response token against hCaptcha's siteverify endpoint.
 * Network or parse failures fail closed (return false) and log under `logTag`.
 */
export async function verifyHcaptchaToken(
  secret: string,
  token: string,
  logTag: string,
): Promise<boolean> {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);

  try {
    const res = await fetch("https://hcaptcha.com/siteverify", { method: "POST", body: form });
    const result = await res.json();
    return result.success === true;
  } catch {
    console.error(`[${logTag}] hCaptcha verification failed`);
    return false;
  }
}

/** CAPTCHA is required when HCAPTCHA_SECRET_KEY is configured (preview/prod fail-closed). */
export function isHcaptchaRequired(): boolean {
  return isCaptchaEnforced(optionalSecret("HCAPTCHA_SECRET_KEY"));
}

/**
 * Fail-closed verification for public endpoints: passes when no secret is
 * configured, otherwise requires a token that hCaptcha accepts.
 */
export async function verifyEnforcedCaptcha(
  token: string | undefined,
  logTag: string,
): Promise<boolean> {
  const secret = optionalSecret("HCAPTCHA_SECRET_KEY");
  if (!isCaptchaEnforced(secret)) return true;
  if (!secret || !token) return false;
  return verifyHcaptchaToken(secret, token, logTag);
}
