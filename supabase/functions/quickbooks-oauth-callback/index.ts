import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { withCorrelationId } from "../_shared/supabase-clients.ts";
import { MissingSecretError, requireSecret } from "../_shared/require-secret.ts";
import { logStep } from "./qb-oauth-validation.ts";
import { parseOAuthState, validateOAuthStateTimestamp } from "./qb-oauth-state.ts";
import {
  buildOAuthRedirectUri,
  resolveOAuthRedirectBaseUrl,
  validateOAuthRedirectBaseUrl,
} from "./qb-oauth-redirect-uri.ts";
import { exchangeAuthorizationCode } from "./qb-oauth-intuit-api.ts";
import {
  storeQuickBooksCredentials,
  verifyOrganization,
} from "./qb-oauth-credentials-store.ts";
import {
  buildAccessDeniedRedirectUrl,
  buildOAuthErrorRedirectUrl,
  buildSuccessRedirectUrl,
  resolveProductionUrl,
} from "./qb-oauth-success-redirect.ts";

const FUNCTION_NAME = "quickbooks-oauth-callback";

Deno.serve(withCorrelationId(async (req, ctx) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { method: req.method, correlation_id: ctx.correlationId });

    const clientId = requireSecret("INTUIT_CLIENT_ID", { functionName: FUNCTION_NAME });
    const clientSecret = requireSecret("INTUIT_CLIENT_SECRET", { functionName: FUNCTION_NAME });
    const supabaseUrl = requireSecret("SUPABASE_URL", { functionName: FUNCTION_NAME });
    const supabaseServiceKey = requireSecret("SUPABASE_SERVICE_ROLE_KEY", { functionName: FUNCTION_NAME });
    const productionUrl = resolveProductionUrl();
    const qbOAuthRedirectBaseUrl = resolveOAuthRedirectBaseUrl(
      Deno.env.get("QB_OAUTH_REDIRECT_BASE_URL"),
      supabaseUrl,
    );

    validateOAuthRedirectBaseUrl(qbOAuthRedirectBaseUrl);

    logStep("Using OAuth redirect base URL", {
      baseUrl: qbOAuthRedirectBaseUrl,
      source: Deno.env.get("QB_OAUTH_REDIRECT_BASE_URL")
        ? "deprecated_QB_OAUTH_REDIRECT_BASE_URL"
        : "SUPABASE_URL",
    });

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const realmId = url.searchParams.get("realmId");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    logStep("Received OAuth callback", {
      hasCode: !!code,
      realmId,
      hasState: !!stateParam,
      error,
      errorDescription,
    });

    if (error) {
      logStep("OAuth error from Intuit", { error, errorDescription });
      const userFriendlyError = error === "access_denied"
        ? "QuickBooks connection was cancelled"
        : error === "invalid_request"
        ? "Invalid OAuth request"
        : "QuickBooks connection failed";
      return Response.redirect(
        buildAccessDeniedRedirectUrl(productionUrl, error, userFriendlyError),
        302,
      );
    }

    if (!code) {
      throw new Error("Missing authorization code");
    }

    if (!realmId) {
      throw new Error("Missing realmId (QuickBooks company ID)");
    }

    const state = parseOAuthState(stateParam);
    validateOAuthStateTimestamp(state);

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: sessionData, error: sessionError } = await supabaseClient
      .rpc("validate_quickbooks_oauth_session", {
        p_session_token: state.sessionToken,
      });

    if (sessionError) {
      logStep("Session validation error", { error: sessionError.message });
      throw new Error("Failed to validate OAuth session");
    }

    if (!sessionData || sessionData.length === 0 || !sessionData[0]?.is_valid) {
      logStep("Invalid or expired session", {
        sessionToken: state.sessionToken.substring(0, 10) + "...",
      });
      throw new Error("Invalid or expired OAuth session. Please try connecting again.");
    }

    const session = sessionData[0];
    const organizationId = session.organization_id;
    const userId = session.user_id;
    const redirectUrl = session.redirect_url;
    const sessionNonce = session.nonce;
    const originUrl = session.origin_url;

    if (!sessionNonce) {
      logStep("Session validation error", { error: "Session nonce not found" });
      throw new Error("Invalid OAuth session: missing nonce");
    }

    if (state.nonce !== sessionNonce) {
      logStep("Nonce validation failed", { error: "Nonce mismatch" });
      throw new Error("OAuth nonce mismatch. Possible CSRF attack.");
    }

    logStep("Session validated", {
      organizationId,
      userId,
      hasRedirectUrl: !!redirectUrl,
      hasOriginUrl: !!originUrl,
      originUrl: originUrl ? originUrl.substring(0, 50) : null,
    });

    const redirectUri = buildOAuthRedirectUri(qbOAuthRedirectBaseUrl);
    const {
      tokenData,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    } = await exchangeAuthorizationCode(code, redirectUri, clientId, clientSecret);

    const now = new Date();
    await verifyOrganization(supabaseClient, organizationId);

    logStep("User authorization verified via session", {
      organizationId,
      userId,
    });

    await storeQuickBooksCredentials(supabaseClient, {
      organizationId,
      realmId,
      tokenData,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      now,
    });

    const successUrl = buildSuccessRedirectUrl({
      productionUrl,
      originUrl,
      redirectUrl,
      realmId,
    });

    logStep("Redirecting to success URL", { successUrl: successUrl.substring(0, 100) });
    return Response.redirect(successUrl, 302);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!(error instanceof MissingSecretError)) {
      logStep("ERROR", { message: errorMessage, correlation_id: ctx.correlationId });
    }

    const productionUrl = resolveProductionUrl();
    const errorUrl = buildOAuthErrorRedirectUrl(
      productionUrl,
      "Failed to connect QuickBooks. Please try again.",
    );

    return Response.redirect(errorUrl, 302);
  }
}));
