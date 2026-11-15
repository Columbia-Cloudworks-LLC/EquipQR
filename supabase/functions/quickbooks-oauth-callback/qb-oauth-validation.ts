import {
  createOAuthCallbackLogStep,
  isValidOAuthRedirectUrl,
} from "../_shared/oauth-callback-validation.ts";

export const STATE_TTL_MS = 60 * 60 * 1000;

export const logStep = createOAuthCallbackLogStep("QUICKBOOKS-OAUTH-CALLBACK");

/**
 * Validates a redirect URL against exact configured app origins.
 * Loopback redirects are only valid when the public site URL is local/dev.
 */
export function isValidRedirectUrl(redirectUrl: string | null, productionUrl: string): boolean {
  return isValidOAuthRedirectUrl(redirectUrl, productionUrl, logStep);
}
