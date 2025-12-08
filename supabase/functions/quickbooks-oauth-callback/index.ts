import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  // Avoid logging sensitive data like tokens
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
    delete safeDetails.refresh_token;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : '';
  console.log(`[QUICKBOOKS-OAUTH-CALLBACK] ${step}${detailsStr}`);
};

// Intuit OAuth endpoints
const INTUIT_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

interface IntuitTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number; // seconds until access token expires (typically 3600 = 1 hour)
  x_refresh_token_expires_in: number; // seconds until refresh token expires (typically 8726400 = 100 days)
  scope?: string;
}

interface OAuthState {
  sessionToken: string; // Server-side session token (validated against database)
  timestamp: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { method: req.method });

    // Get environment variables
    const clientId = Deno.env.get("INTUIT_CLIENT_ID");
    const clientSecret = Deno.env.get("INTUIT_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const productionUrl = Deno.env.get("PRODUCTION_URL") || "https://equipqr.app";

    if (!clientId || !clientSecret) {
      logStep("ERROR", { message: "Missing INTUIT_CLIENT_ID or INTUIT_CLIENT_SECRET" });
      throw new Error("QuickBooks OAuth is not configured");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }

    // Parse query parameters from the URL
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
      errorDescription 
    });

    // Handle OAuth errors from Intuit
    if (error) {
      logStep("OAuth error from Intuit", { error, errorDescription });
      // Sanitize error description - only pass through standard OAuth error codes
      // Map to user-friendly messages to prevent information exposure
      const userFriendlyError = error === 'access_denied' 
        ? 'QuickBooks connection was cancelled'
        : error === 'invalid_request'
        ? 'Invalid OAuth request'
        : 'QuickBooks connection failed';
      const errorUrl = `${productionUrl}/settings/integrations?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(userFriendlyError)}`;
      return Response.redirect(errorUrl, 302);
    }

    // Validate required parameters
    if (!code) {
      throw new Error("Missing authorization code");
    }

    if (!realmId) {
      throw new Error("Missing realmId (QuickBooks company ID)");
    }

    // Parse state parameter to get session token
    let state: OAuthState;
    try {
      state = stateParam ? JSON.parse(atob(stateParam)) : null;
    } catch {
      throw new Error("Invalid state parameter");
    }

    if (!state?.sessionToken) {
      throw new Error("Missing session token in state parameter");
    }

    // Validate timestamp: must be within last hour to prevent replay attacks
    const now = Date.now();
    const stateTimestamp = Number(state.timestamp);
    if (isNaN(stateTimestamp)) {
      throw new Error("Invalid timestamp in state parameter");
    }

    const oneHourMs = 60 * 60 * 1000;
    if (stateTimestamp > now || now - stateTimestamp > oneHourMs) {
      logStep("State timestamp validation failed", { 
        stateTimestamp, 
        now, 
        age: now - stateTimestamp 
      });
      throw new Error("OAuth state has expired. Please try connecting again.");
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Validate session token server-side (prevents state tampering)
    const { data: sessionData, error: sessionError } = await supabaseClient
      .rpc('validate_quickbooks_oauth_session', {
        p_session_token: state.sessionToken
      });

    if (sessionError) {
      logStep("Session validation error", { error: sessionError.message });
      throw new Error("Failed to validate OAuth session");
    }

    if (!sessionData || sessionData.length === 0 || !sessionData[0]?.is_valid) {
      logStep("Invalid or expired session", { sessionToken: state.sessionToken.substring(0, 10) + '...' });
      throw new Error("Invalid or expired OAuth session. Please try connecting again.");
    }

    const session = sessionData[0];
    const organizationId = session.organization_id;
    const userId = session.user_id;
    const redirectUrl = session.redirect_url;

    logStep("Session validated", { 
      organizationId, 
      userId,
      hasRedirectUrl: !!redirectUrl
    });

    // Construct redirect URI (must match what was used in authorization URL)
    const redirectUri = `${supabaseUrl}/functions/v1/quickbooks-oauth-callback`;

    // Exchange authorization code for tokens
    logStep("Exchanging code for tokens");
    
    const tokenRequestBody = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
    });

    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    
    const tokenResponse = await fetch(INTUIT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
        "Accept": "application/json",
      },
      body: tokenRequestBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      // Sanitize error text for logging - truncate and remove potential sensitive data
      const sanitizedError = errorText.length > 200 
        ? errorText.substring(0, 200) + '...' 
        : errorText;
      logStep("Token exchange failed", { 
        status: tokenResponse.status, 
        statusText: tokenResponse.statusText,
        error: sanitizedError 
      });
      // Don't include errorText in thrown error to prevent information exposure
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }

    const tokenData: IntuitTokenResponse = await tokenResponse.json();
    logStep("Token exchange successful", { 
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      x_refresh_token_expires_in: tokenData.x_refresh_token_expires_in,
      scope: tokenData.scope
    });

    // Calculate expiration timestamps
    const now = new Date();
    const accessTokenExpiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);
    const refreshTokenExpiresAt = new Date(now.getTime() + tokenData.x_refresh_token_expires_in * 1000);

    // Verify the organization exists (double-check, though session already validated it)
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      logStep("Organization not found", { organizationId, error: orgError?.message });
      throw new Error("Organization not found");
    }

    logStep("Organization verified", { organizationId, organizationName: org.name });

    // Security: Session validation already confirmed:
    // 1. User is authenticated (session created via RPC requires auth)
    // 2. User is admin/owner of organization (validated when session was created)
    // 3. Session is not expired or reused (validated by RPC function)
    // 4. Session token is single-use (marked as used after validation)
    // No additional validation needed - session token is the source of truth
    logStep("User authorization verified via session", { 
      organizationId, 
      userId 
    });

    // Upsert QuickBooks credentials
    const { error: upsertError } = await supabaseClient
      .from('quickbooks_credentials')
      .upsert({
        organization_id: organizationId,
        realm_id: realmId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        access_token_expires_at: accessTokenExpiresAt.toISOString(),
        refresh_token_expires_at: refreshTokenExpiresAt.toISOString(),
        scopes: tokenData.scope || 'com.intuit.quickbooks.accounting',
        token_type: tokenData.token_type || 'bearer',
        updated_at: now.toISOString(),
      }, {
        onConflict: 'organization_id,realm_id'
      });

    if (upsertError) {
      logStep("Failed to store credentials", { error: upsertError.message });
      throw new Error(`Failed to store QuickBooks credentials: ${upsertError.message}`);
    }

    logStep("Credentials stored successfully", { organizationId, realmId });

    // Redirect to success page
    const successUrl = redirectUrl || `${productionUrl}/settings/integrations?quickbooks=connected&realm_id=${realmId}`;
    logStep("Redirecting to success URL", { successUrl });
    
    return Response.redirect(successUrl, 302);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("ERROR", { message: errorMessage, stack: errorStack });

    // Get production URL for error redirect
    // Use generic error message to prevent information exposure
    const productionUrl = Deno.env.get("PRODUCTION_URL") || "https://equipqr.app";
    const errorUrl = `${productionUrl}/settings/integrations?error=oauth_failed&error_description=${encodeURIComponent("Failed to connect QuickBooks. Please try again.")}`;
    
    return Response.redirect(errorUrl, 302);
  }
});
