import { logStep } from "./qb-oauth-validation.ts";

const EXPECTED_CALLBACK_PATH = "/functions/v1/quickbooks-oauth-callback";
const RETIRED_OAUTH_REDIRECT_BASE_URLS: Record<string, string> = {
  "https://supabase.preview.equipqr.app": "https://olsdirkvvfegvclbpgrg.supabase.co",
};

export function resolveOAuthRedirectBaseUrl(
  configuredBaseUrl: string | undefined,
  fallbackBaseUrl: string,
): string {
  const rawBaseUrl = (configuredBaseUrl || fallbackBaseUrl).trim().replace(/\/+$/, "");
  return RETIRED_OAUTH_REDIRECT_BASE_URLS[rawBaseUrl] ?? rawBaseUrl;
}

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
