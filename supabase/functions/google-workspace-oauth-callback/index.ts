import { createAdminSupabaseClient, withCorrelationId } from "../_shared/supabase-clients.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { MissingSecretError, requireSecret } from "../_shared/require-secret.ts";
import { logStep } from "./gw-oauth-validation.ts";
import { parseOAuthState, validateOAuthStateTimestamp } from "./gw-oauth-state.ts";
import {
  buildOAuthRedirectUri,
  resolveOAuthRedirectBaseUrl,
  validateOAuthRedirectUri,
} from "./gw-oauth-redirect-uri.ts";
import {
  exchangeAuthorizationCode,
  fetchGoogleUserInfo,
  extractUserDomain,
  verifyGoogleWorkspaceAdmin,
} from "./gw-oauth-google-api.ts";
import { resolveEffectiveOrganizationId } from "./gw-oauth-org-resolution.ts";
import { storeGoogleWorkspaceCredentials } from "./gw-oauth-credentials-store.ts";
import {
  resolveProductionUrl,
  resolveFallbackProductionUrl,
  buildGoogleOAuthErrorRedirectUrl,
  buildGoogleAccessDeniedRedirectUrl,
  buildSuccessRedirectUrl,
} from "./gw-oauth-success-redirect.ts";

const FUNCTION_NAME = "google-workspace-oauth-callback";

/**
 * Returns CORS headers for the OAuth callback. Extends the shared origin-
 * validated headers to also allow GET, since this endpoint is invoked via
 * browser redirect from Google.
 */
function getCallbackCorsHeaders(req: Request): Record<string, string> {
  return {
    ...getCorsHeaders(req),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

Deno.serve(withCorrelationId(async (req, ctx) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCallbackCorsHeaders(req) });
  }

  try {
    logStep("Function started", { method: req.method, correlation_id: ctx.correlationId });

    const clientId = requireSecret("GOOGLE_WORKSPACE_CLIENT_ID", { functionName: FUNCTION_NAME });
    const clientSecret = requireSecret("GOOGLE_WORKSPACE_CLIENT_SECRET", { functionName: FUNCTION_NAME });
    const supabaseUrl = requireSecret("SUPABASE_URL", { functionName: FUNCTION_NAME });
    const oauthRedirectBaseUrl = resolveOAuthRedirectBaseUrl(
      Deno.env.get("GW_OAUTH_REDIRECT_BASE_URL"),
      supabaseUrl,
    );
    const resolvedProductionUrl = resolveProductionUrl();

    try {
      new URL(oauthRedirectBaseUrl);
    } catch {
      logStep("ERROR", { message: "Invalid GW_OAUTH_REDIRECT_BASE_URL configuration" });
      throw new Error("Invalid OAuth redirect base URL configuration");
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    logStep("Received OAuth callback", {
      hasCode: !!code,
      hasState: !!stateParam,
      error,
      errorDescription,
    });

    if (error) {
      const userFriendlyError = error === "access_denied"
        ? "Google Workspace connection was cancelled"
        : "Google Workspace connection failed";
      return Response.redirect(
        buildGoogleAccessDeniedRedirectUrl(resolvedProductionUrl, error, userFriendlyError),
        302,
      );
    }

    if (!code) {
      throw new Error("Missing authorization code");
    }

    if (!stateParam) {
      throw new Error("Missing state parameter");
    }

    const state = parseOAuthState(stateParam);
    validateOAuthStateTimestamp(state);

    const supabaseClient = createAdminSupabaseClient();

    const { data: sessionData, error: sessionError } = await supabaseClient
      .rpc("validate_google_workspace_oauth_session", {
        p_session_token: state.sessionToken,
      });

    if (sessionError) {
      logStep("Session validation error", { error: sessionError.message });
      throw new Error("Failed to validate OAuth session");
    }

    if (!sessionData || sessionData.length === 0 || !sessionData[0]?.is_valid) {
      logStep("Invalid or expired session", { sessionToken: state.sessionToken.substring(0, 10) + "..." });
      throw new Error("Invalid or expired OAuth session. Please try again.");
    }

    const session = sessionData[0];
    const organizationId = session.organization_id;
    const redirectUrl = session.redirect_url;
    const originUrl = session.origin_url;
    const sessionNonce = session.nonce;

    if (!sessionNonce || state.nonce !== sessionNonce) {
      throw new Error("OAuth nonce mismatch. Possible CSRF attack.");
    }

    const redirectUri = buildOAuthRedirectUri(oauthRedirectBaseUrl);
    validateOAuthRedirectUri(redirectUri, supabaseUrl);

    logStep("Token exchange starting", { organizationId, hasSessionOrg: !!organizationId });
    const tokenData = await exchangeAuthorizationCode(code, redirectUri, clientId, clientSecret);
    logStep("Token exchange succeeded", {
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
    });

    const now = new Date();
    const accessTokenExpiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);

    logStep("Userinfo lookup starting");
    const userinfo = await fetchGoogleUserInfo(tokenData.access_token);
    const { userEmail, userDomain } = extractUserDomain(userinfo);
    logStep("Userinfo lookup succeeded", { userDomain, hasEmail: !!userEmail });

    logStep("Workspace admin verification starting", { userDomain });
    await verifyGoogleWorkspaceAdmin(tokenData.access_token, userEmail);
    logStep("Workspace admin verification succeeded", { userDomain });

    logStep("Organization resolution starting", {
      sessionOrganizationId: organizationId,
      userDomain,
    });
    const effectiveOrgId = await resolveEffectiveOrganizationId(supabaseClient, {
      organizationId,
      userDomain,
      userId: session.user_id,
    });
    logStep("Organization resolution succeeded", { effectiveOrgId, userDomain });

    logStep("Credential encryption and storage starting", { effectiveOrgId, userDomain });
    await storeGoogleWorkspaceCredentials(supabaseClient, {
      effectiveOrgId,
      domain: userDomain,
      tokenData,
      userEmail,
      accessTokenExpiresAt,
      now,
    });
    logStep("Credential storage succeeded", { effectiveOrgId, userDomain });

    const successUrl = buildSuccessRedirectUrl({
      originUrl,
      redirectUrl,
      resolvedProductionUrl,
    });

    return Response.redirect(successUrl, 302);
  } catch (error) {
    const fallbackProductionUrl = resolveFallbackProductionUrl();

    if (error instanceof MissingSecretError) {
      return Response.redirect(
        buildGoogleOAuthErrorRedirectUrl(
          fallbackProductionUrl,
          "oauth_failed",
          "Google Workspace OAuth is not configured. Please contact your administrator.",
        ),
        302,
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage, correlation_id: ctx.correlationId });

    const typedError = error as { code?: string; name?: string } | null | undefined;
    const isNotAdminError =
      !!typedError &&
      (typedError.code === "not_workspace_admin" ||
        typedError.name === "NotWorkspaceAdminError");
    const errorCode = isNotAdminError ? "not_workspace_admin" : "oauth_failed";

    const userMessage =
      errorMessage || "Failed to connect Google Workspace. Please try again.";
    const errorUrl = buildGoogleOAuthErrorRedirectUrl(
      fallbackProductionUrl,
      errorCode,
      userMessage,
    );
    return Response.redirect(errorUrl, 302);
  }
}));
