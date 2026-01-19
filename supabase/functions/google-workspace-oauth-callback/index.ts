import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encryptToken, getTokenEncryptionKey } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
    delete safeDetails.refresh_token;
    delete safeDetails.nonce;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : "";
  console.log(`[GOOGLE-WORKSPACE-OAUTH-CALLBACK] ${step}${detailsStr}`);
};

interface OAuthState {
  sessionToken: string;
  nonce: string;
  timestamp: number;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";

function isValidRedirectUrl(redirectUrl: string | null, productionUrl: string): boolean {
  if (!redirectUrl) return true;

  try {
    if (redirectUrl.startsWith("/") && !redirectUrl.startsWith("//")) {
      return true;
    }

    const url = new URL(redirectUrl);
    const productionDomain = new URL(productionUrl).hostname;

    // Only allow production domain and localhost for development
    // Wildcard domains (*.vercel.app, *.netlify.app) are not allowed as they
    // could be exploited by malicious apps deployed on these platforms
    const allowedDomains = [
      productionDomain,
      "localhost",
      "127.0.0.1",
    ];

    for (const domain of allowedDomains) {
      if (domain.startsWith(".")) {
        if (url.hostname.endsWith(domain) || url.hostname === domain.slice(1)) {
          return true;
        }
      } else if (url.hostname === domain) {
        return true;
      }
    }

    logStep("Redirect URL validation failed", {
      redirectUrl: redirectUrl.substring(0, 100),
      hostname: url.hostname,
      productionDomain,
    });
    return false;
  } catch {
    logStep("Redirect URL is malformed", { redirectUrl: redirectUrl.substring(0, 100) });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { method: req.method });

    const clientId = Deno.env.get("GOOGLE_WORKSPACE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_WORKSPACE_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const productionUrl = Deno.env.get("PRODUCTION_URL") || "https://equipqr.app";
    const oauthRedirectBaseUrl = Deno.env.get("GW_OAUTH_REDIRECT_BASE_URL") || supabaseUrl;

    if (!clientId || !clientSecret) {
      logStep("ERROR", { message: "Missing GOOGLE_WORKSPACE_CLIENT_ID or GOOGLE_WORKSPACE_CLIENT_SECRET" });
      throw new Error("Google Workspace OAuth is not configured");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }

    try {
      new URL(oauthRedirectBaseUrl);
    } catch {
      logStep("ERROR", { message: `Invalid GW_OAUTH_REDIRECT_BASE_URL: ${oauthRedirectBaseUrl}` });
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
      const errorUrl = `${productionUrl}/dashboard/onboarding/workspace?gw_error=${encodeURIComponent(error)}&gw_error_description=${encodeURIComponent(userFriendlyError)}`;
      return Response.redirect(errorUrl, 302);
    }

    if (!code) {
      throw new Error("Missing authorization code");
    }

    let state: OAuthState;
    try {
      state = stateParam ? JSON.parse(atob(stateParam)) : null;
    } catch {
      throw new Error("Invalid state parameter");
    }

    if (!state?.sessionToken || !state?.nonce) {
      throw new Error("Missing state parameters");
    }

    const nowMs = Date.now();
    const stateTimestamp = Number(state.timestamp);
    if (isNaN(stateTimestamp)) {
      throw new Error("Invalid timestamp in state parameter");
    }

    // Tighter validation: 15-minute TTL with 5-minute clock skew tolerance
    const stateTtlMs = 15 * 60 * 1000; // 15 minutes
    const maxClockSkewMs = 5 * 60 * 1000; // 5 minutes

    // Reject timestamps too far in the future (accounting for clock skew)
    if (stateTimestamp - nowMs > maxClockSkewMs) {
      throw new Error("OAuth state has an invalid timestamp. Please try again.");
    }

    // Reject expired timestamps
    if (nowMs - stateTimestamp > stateTtlMs) {
      throw new Error("OAuth state has expired. Please try again.");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

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

    const redirectBaseUrl = oauthRedirectBaseUrl.trim().replace(/\/+$/, "");
    const redirectUri = `${redirectBaseUrl}/functions/v1/google-workspace-oauth-callback`;

    const tokenRequestBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenRequestBody.toString(),
    });

    if (!tokenResponse.ok) {
      logStep("Token exchange failed", { status: tokenResponse.status });
      throw new Error("Failed to exchange authorization code. Please try again.");
    }

    const tokenData: GoogleTokenResponse = await tokenResponse.json();
    logStep("Token exchange successful", {
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
    });

    const now = new Date();
    const accessTokenExpiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);

    const { data: domainData, error: domainError } = await supabaseClient
      .from("workspace_domains")
      .select("domain")
      .eq("organization_id", organizationId)
      .single();

    if (domainError || !domainData?.domain) {
      logStep("Workspace domain not found", { organizationId, error: domainError?.message });
      throw new Error("Workspace domain not found for organization");
    }

    const domain = domainData.domain;

    let refreshToken = tokenData.refresh_token || null;
    if (!refreshToken) {
      const { data: existingCreds } = await supabaseClient
        .from("google_workspace_credentials")
        .select("refresh_token")
        .eq("organization_id", organizationId)
        .eq("domain", domain)
        .maybeSingle();

      refreshToken = existingCreds?.refresh_token || null;
    }

    if (!refreshToken) {
      throw new Error("Google Workspace refresh token missing. Please reconnect.");
    }

    // Encrypt the refresh token before storing
    const encryptionKey = getTokenEncryptionKey();
    const encryptedRefreshToken = await encryptToken(refreshToken, encryptionKey);
    logStep("Refresh token encrypted for storage");

    const { error: upsertError } = await supabaseClient
      .from("google_workspace_credentials")
      .upsert({
        organization_id: organizationId,
        domain,
        refresh_token: encryptedRefreshToken,
        access_token_expires_at: accessTokenExpiresAt.toISOString(),
        scopes: tokenData.scope || null,
        updated_at: now.toISOString(),
      }, {
        onConflict: "organization_id,domain",
      });

    if (upsertError) {
      logStep("Failed to store credentials", { error: upsertError.message });
      throw new Error("Failed to store Google Workspace credentials");
    }

    const isOriginValid = !!originUrl && isValidRedirectUrl(originUrl, productionUrl);
    const finalBaseUrl = (isOriginValid ? originUrl : productionUrl).replace(/\/+$/, "");
    const defaultRedirectPath = "/dashboard/onboarding/workspace";

    let successUrl: string;
    if (redirectUrl) {
      if (!isValidRedirectUrl(redirectUrl, productionUrl)) {
        successUrl = `${finalBaseUrl}${defaultRedirectPath}?gw_connected=true`;
      } else {
        const isAbsolute = /^https?:\/\//i.test(redirectUrl);
        const baseSuccessUrl = isAbsolute ? redirectUrl : `${finalBaseUrl}${redirectUrl}`;
        const separator = baseSuccessUrl.includes("?") ? "&" : "?";
        successUrl = `${baseSuccessUrl}${separator}gw_connected=true`;
      }
    } else {
      successUrl = `${finalBaseUrl}${defaultRedirectPath}?gw_connected=true`;
    }

    return Response.redirect(successUrl, 302);
  } catch (error) {
    const productionUrl = Deno.env.get("PRODUCTION_URL") || "https://equipqr.app";
    const userMessage = "Failed to connect Google Workspace. Please try again.";
    const errorUrl = `${productionUrl}/dashboard/onboarding/workspace?gw_error=oauth_failed&gw_error_description=${encodeURIComponent(userMessage)}`;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return Response.redirect(errorUrl, 302);
  }
});

