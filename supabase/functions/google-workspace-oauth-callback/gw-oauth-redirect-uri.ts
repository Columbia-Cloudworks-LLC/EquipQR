import { logStep } from "./gw-oauth-validation.ts";

const EXPECTED_CALLBACK_PATH = "/functions/v1/google-workspace-oauth-callback";

export function buildOAuthRedirectUri(oauthRedirectBaseUrl: string): string {
  const redirectBaseUrl = oauthRedirectBaseUrl.trim().replace(/\/+$/, "");
  return `${redirectBaseUrl}${EXPECTED_CALLBACK_PATH}`;
}

/**
 * Validates redirect_uri against allowlist to prevent redirect manipulation attacks.
 * We use exact URL matching with hostname validation to prevent:
 * 1. Path traversal attacks (e.g., "base/callback/../evil")
 * 2. Subdomain attacks (e.g., attacker controls "evil.supabase.co")
 */
export function validateOAuthRedirectUri(
  redirectUri: string,
  supabaseUrl: string,
): void {
  const allowedBaseUrls = [
    supabaseUrl?.trim().replace(/\/+$/, ""),
    Deno.env.get("GW_OAUTH_REDIRECT_BASE_URL")?.trim().replace(/\/+$/, ""),
  ].filter(Boolean) as string[];

  // Parse redirect URI to validate hostname separately
  let parsedRedirectUri: URL;
  try {
    parsedRedirectUri = new URL(redirectUri);
  } catch (error) {
    const parseError = error instanceof Error ? error.message : String(error);
    logStep("ERROR: Invalid redirect_uri format", { redirectUri, error: parseError });
    throw new Error(
      `Invalid OAuth redirect URI format. Expected an absolute URL ending with "${EXPECTED_CALLBACK_PATH}" (e.g., "https://<your-domain>${EXPECTED_CALLBACK_PATH}") but got "${redirectUri}". Parse error: ${parseError}`,
    );
  }

  // Build allowlist with both full URIs and parsed hostnames for validation
  const allowedRedirectUris = allowedBaseUrls.map((base) => base + EXPECTED_CALLBACK_PATH);
  const allowedHostnames = new Set<string>();
  
  for (const baseUrl of allowedBaseUrls) {
    try {
      const parsed = new URL(baseUrl);
      // Store the exact hostname (no subdomains allowed)
      allowedHostnames.add(parsed.hostname);
    } catch (error) {
      logStep("WARNING: Could not parse base URL", { baseUrl, error: String(error) });
    }
  }

  // Ensure at least one valid base URL was configured
  if (allowedHostnames.size === 0) {
    logStep("ERROR: No valid base URLs configured", {
      allowedBaseUrls,
      note: "All base URLs failed to parse. See WARNING logs above for details.",
    });
    throw new Error("No valid base URLs configured for OAuth redirect validation");
  }

  // Validate: exact URI match AND hostname match (no subdomain attacks)
  const isUriExactMatch = allowedRedirectUris.includes(redirectUri);
  const isHostnameAllowed = allowedHostnames.has(parsedRedirectUri.hostname);
  const isPathCorrect = parsedRedirectUri.pathname === EXPECTED_CALLBACK_PATH;

  if (!isUriExactMatch || !isHostnameAllowed || !isPathCorrect) {
    // Log only hostname and pathname to avoid exposing sensitive query parameters or tokens
    // that an attacker might inject into the redirectUri
    logStep("ERROR: redirect_uri validation failed", {
      hostname: parsedRedirectUri.hostname,
      pathname: parsedRedirectUri.pathname,
      allowedHostnames: Array.from(allowedHostnames),
      expectedPath: EXPECTED_CALLBACK_PATH,
    });
    throw new Error("Invalid OAuth redirect configuration");
  }
}

export const __gwOauthRedirectUriTestables = {
  buildOAuthRedirectUri,
  validateOAuthRedirectUri,
  EXPECTED_CALLBACK_PATH,
};
