import { logStep } from "./qb-oauth-validation.ts";

const EXPECTED_CALLBACK_PATH = "/functions/v1/quickbooks-oauth-callback";

export function validateOAuthRedirectBaseUrl(qbOAuthRedirectBaseUrl: string): void {
  try {
    new URL(qbOAuthRedirectBaseUrl);
  } catch {
    logStep("ERROR", { message: `Invalid QB_OAUTH_REDIRECT_BASE_URL: ${qbOAuthRedirectBaseUrl}` });
    throw new Error("Invalid OAuth redirect base URL configuration");
  }
}

export function buildOAuthRedirectUri(qbOAuthRedirectBaseUrl: string): string {
  const redirectBaseUrl = qbOAuthRedirectBaseUrl.trim().replace(/\/+$/, "");
  return `${redirectBaseUrl}${EXPECTED_CALLBACK_PATH}`;
}

export const __qbOauthRedirectUriTestables = {
  buildOAuthRedirectUri,
  validateOAuthRedirectBaseUrl,
  EXPECTED_CALLBACK_PATH,
};
