import { logStep } from "./gw-oauth-validation.ts";
import {
  buildOAuthCallbackRedirectUri,
  resolveOAuthRedirectBaseUrl,
} from "../_shared/oauth-redirect-base.ts";

const EXPECTED_CALLBACK_PATH = "/functions/v1/google-workspace-oauth-callback";

export { resolveOAuthRedirectBaseUrl };

export function buildOAuthRedirectUri(oauthRedirectBaseUrl: string): string {
  return buildOAuthCallbackRedirectUri(oauthRedirectBaseUrl, EXPECTED_CALLBACK_PATH);
}

/**
 * Validates redirect_uri against the derived Supabase callback base.
 */
export function validateOAuthRedirectUri(
  redirectUri: string,
  supabaseUrl: string,
): void {
  const oauthRedirectBaseUrl = resolveOAuthRedirectBaseUrl(
    Deno.env.get("GW_OAUTH_REDIRECT_BASE_URL"),
    supabaseUrl,
  );
  const allowedBaseUrls = [oauthRedirectBaseUrl];

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

  const allowedRedirectUris = allowedBaseUrls.map((base) => base + EXPECTED_CALLBACK_PATH);
  const allowedHostnames = new Set<string>();

  for (const baseUrl of allowedBaseUrls) {
    try {
      const parsed = new URL(baseUrl);
      allowedHostnames.add(parsed.hostname);
    } catch (error) {
      logStep("WARNING: Could not parse base URL", { baseUrl, error: String(error) });
    }
  }

  if (allowedHostnames.size === 0) {
    logStep("ERROR: No valid base URLs configured", {
      allowedBaseUrls,
      note: "All base URLs failed to parse. See WARNING logs above for details.",
    });
    throw new Error("No valid base URLs configured for OAuth redirect validation");
  }

  const isUriExactMatch = allowedRedirectUris.includes(redirectUri);
  const isHostnameAllowed = allowedHostnames.has(parsedRedirectUri.hostname);
  const isPathCorrect = parsedRedirectUri.pathname === EXPECTED_CALLBACK_PATH;

  if (!isUriExactMatch || !isHostnameAllowed || !isPathCorrect) {
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
  resolveOAuthRedirectBaseUrl,
  validateOAuthRedirectUri,
  EXPECTED_CALLBACK_PATH,
};
