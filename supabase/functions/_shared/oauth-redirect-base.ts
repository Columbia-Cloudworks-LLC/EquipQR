/**
 * Canonical OAuth redirect base URL resolution for Edge Functions.
 *
 * OAuth callback URIs are derived from SUPABASE_URL by default. Deprecated
 * QB_OAUTH_REDIRECT_BASE_URL / GW_OAUTH_REDIRECT_BASE_URL overrides are still
 * accepted for backward compatibility and normalized when retired.
 */

/** Retired custom hostnames that must normalize to the project default URL. */
const RETIRED_OAUTH_REDIRECT_BASE_URLS: Record<string, string> = {
  "https://preview.supabase.app": "https://olsdirkvvfegvclbpgrg.supabase.co",
  "https://supabase.preview.equipqr.app": "https://olsdirkvvfegvclbpgrg.supabase.co",
};

/**
 * Auto-injected `SUPABASE_URL` uses the *.supabase.co project hostname while
 * vendor consoles and Vercel `VITE_SUPABASE_URL` use the custom API domain.
 */
const CANONICAL_OAUTH_REDIRECT_BASE_BY_SUPABASE_URL: Record<string, string> = {
  "https://ymxkzronkhwxzcdcbnwq.supabase.co": "https://supabase.equipqr.app",
};

export function resolveOAuthRedirectBaseUrl(
  configuredBaseUrl: string | undefined,
  supabaseUrl: string,
): string {
  const candidate = configuredBaseUrl?.trim();
  const rawBaseUrl = (candidate ? candidate : supabaseUrl).trim().replace(/\/+$/, "");
  return (
    RETIRED_OAUTH_REDIRECT_BASE_URLS[rawBaseUrl] ??
    CANONICAL_OAUTH_REDIRECT_BASE_BY_SUPABASE_URL[rawBaseUrl] ??
    rawBaseUrl
  );
}

export function buildOAuthCallbackRedirectUri(
  oauthRedirectBaseUrl: string,
  callbackPath: string,
): string {
  const redirectBaseUrl = oauthRedirectBaseUrl.trim().replace(/\/+$/, "");
  return `${redirectBaseUrl}${callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`}`;
}
