/**
 * Canonical OAuth redirect base URL resolution for Edge Functions.
 *
 * OAuth callback URIs are derived from SUPABASE_URL by default. Deprecated
 * QB_OAUTH_REDIRECT_BASE_URL / GW_OAUTH_REDIRECT_BASE_URL overrides are still
 * accepted for backward compatibility and normalized when retired.
 */

const RETIRED_OAUTH_REDIRECT_BASE_URLS: Record<string, string> = {
  "https://preview.supabase.app": "https://olsdirkvvfegvclbpgrg.supabase.co",
  "https://supabase.preview.equipqr.app": "https://olsdirkvvfegvclbpgrg.supabase.co",
};

export function resolveOAuthRedirectBaseUrl(
  configuredBaseUrl: string | undefined,
  supabaseUrl: string,
): string {
  const rawBaseUrl = (configuredBaseUrl || supabaseUrl).trim().replace(/\/+$/, "");
  return RETIRED_OAUTH_REDIRECT_BASE_URLS[rawBaseUrl] ?? rawBaseUrl;
}

export function buildOAuthCallbackRedirectUri(
  oauthRedirectBaseUrl: string,
  callbackPath: string,
): string {
  const redirectBaseUrl = oauthRedirectBaseUrl.trim().replace(/\/+$/, "");
  return `${redirectBaseUrl}${callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`}`;
}
