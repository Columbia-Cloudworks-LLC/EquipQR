import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  // Avoid logging sensitive data like tokens and nonces
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
    delete safeDetails.refresh_token;
    delete safeDetails.nonce;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : '';
  console.log(`[QUICKBOOKS-OAUTH-CALLBACK] ${step}${detailsStr}`);
};

/**
 * Validates a redirect URL against allowed domains
 * Only allows redirects to the same domain as the production URL, relative paths,
 * localhost, or allowed preview domains
 * @param redirectUrl - The redirect URL to validate
 * @param productionUrl - The production URL to validate against
 * @returns true if the redirect URL is valid, false otherwise
 */
function isValidRedirectUrl(redirectUrl: string | null, productionUrl: string): boolean {
  if (!redirectUrl) {
    return true; // null/empty is valid (will use default)
  }

  try {
    // Check if it's a relative path (starts with /)
    if (redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
      return true;
    }
    
    const url = new URL(redirectUrl);
    const productionDomain = new URL(productionUrl).hostname;
    
    // Allow redirects to the same domain as production
    if (url.hostname === productionDomain) {
      return true;
    }
    
    // For development/staging, also allow localhost, 127.0.0.1, and vercel preview URLs
    // This allows the app to work in local development and preview deployments
    const allowedDomains = [
      productionDomain,
      'localhost',
      '127.0.0.1',
      '.vercel.app', // Vercel preview deployments
      '.netlify.app', // Netlify preview deployments
    ];
    
    // Check if hostname matches any allowed domain or is a subdomain of an allowed domain
    for (const domain of allowedDomains) {
      if (domain.startsWith('.')) {
        // Wildcard domain (e.g., .vercel.app)
        if (url.hostname.endsWith(domain) || url.hostname === domain.slice(1)) {
          return true;
        }
      } else if (url.hostname === domain) {
        return true;
      }
    }
    
    logStep("Redirect URL validation failed", { 
      redirectUrl: redirectUrl.substring(0, 100), // Log first 100 chars only
      hostname: url.hostname,
      productionDomain 
    });
    return false;
  } catch {
    // Invalid URL format
    logStep("Redirect URL is malformed", { redirectUrl: redirectUrl.substring(0, 100) });
    return false;
  }
}

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
  nonce: string; // Random nonce for CSRF protection
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
    // QB_OAUTH_REDIRECT_BASE_URL must match what the frontend uses (VITE_QB_OAUTH_REDIRECT_BASE_URL)
    // This is required because OAuth 2.0 requires exact redirect_uri match between authorization and token exchange
    // If using a custom domain for Supabase (e.g., supabase.equipqr.app), this must be set to that domain
    const qbOAuthRedirectBaseUrl = Deno.env.get("QB_OAUTH_REDIRECT_BASE_URL") || supabaseUrl;

    if (!clientId || !clientSecret) {
      logStep("ERROR", { message: "Missing INTUIT_CLIENT_ID or INTUIT_CLIENT_SECRET" });
      throw new Error("QuickBooks OAuth is not configured");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }

    // Validate OAuth redirect base URL format
    // Note: qbOAuthRedirectBaseUrl is guaranteed to have a value at this point due to fallback to supabaseUrl
    try {
      new URL(qbOAuthRedirectBaseUrl);
    } catch {
      logStep("ERROR", { message: `Invalid QB_OAUTH_REDIRECT_BASE_URL: ${qbOAuthRedirectBaseUrl}` });
      throw new Error("Invalid OAuth redirect base URL configuration");
    }

    logStep("Using OAuth redirect base URL", { 
      baseUrl: qbOAuthRedirectBaseUrl,
      isCustom: !!Deno.env.get("QB_OAUTH_REDIRECT_BASE_URL")
    });

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
    // Note: At this point we may not have the origin URL yet (state hasn't been parsed)
    // So we redirect to production for OAuth errors from Intuit
    if (error) {
      logStep("OAuth error from Intuit", { error, errorDescription });
      // Sanitize error description - only pass through standard OAuth error codes
      // Map to user-friendly messages to prevent information exposure
      const userFriendlyError = error === 'access_denied' 
        ? 'QuickBooks connection was cancelled'
        : error === 'invalid_request'
        ? 'Invalid OAuth request'
        : 'QuickBooks connection failed';
      const errorUrl = `${productionUrl}/dashboard/organization?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(userFriendlyError)}`;
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

    if (!state?.nonce) {
      throw new Error("Missing nonce in state parameter");
    }

    // Validate timestamp: must be within last hour to prevent replay attacks
    const nowMs = Date.now();
    const stateTimestamp = Number(state.timestamp);
    if (isNaN(stateTimestamp)) {
      throw new Error("Invalid timestamp in state parameter");
    }

    const oneHourMs = 60 * 60 * 1000;
    if (stateTimestamp > nowMs || nowMs - stateTimestamp > oneHourMs) {
      logStep("State timestamp validation failed", { 
        stateTimestamp, 
        now: nowMs, 
        age: nowMs - stateTimestamp 
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
    const sessionNonce = session.nonce;
    const originUrl = session.origin_url; // The origin to redirect back to (e.g., localhost or production)

    // Validate nonce matches the one stored in the session (CSRF protection)
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
      originUrl: originUrl ? originUrl.substring(0, 50) : null
    });

    // Use QB_OAUTH_REDIRECT_BASE_URL (or fallback to SUPABASE_URL) for the redirect_uri
    // This MUST match the redirect_uri used in the authorization request (frontend)
    // OAuth 2.0 requires exact match between authorization and token exchange
    // Note: Must match client preprocessing: .trim().replace(/\/+$/, '')
    const redirectBaseUrl = qbOAuthRedirectBaseUrl.trim().replace(/\/+$/, ''); // Remove whitespace and trailing slashes
    const redirectUri = `${redirectBaseUrl}/functions/v1/quickbooks-oauth-callback`;

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

    // Determine the base URL for the redirect
    // Use the origin URL from the session if available, otherwise fall back to production URL
    // This allows local development to redirect back to localhost
    const baseUrl = originUrl || productionUrl;
    
    // Validate the origin URL if provided (prevent open redirect attacks)
    if (originUrl && !isValidRedirectUrl(originUrl, productionUrl)) {
      logStep("Invalid origin URL rejected, using production URL", { originUrl: originUrl.substring(0, 100) });
    }
    
    const finalBaseUrl = (originUrl && isValidRedirectUrl(originUrl, productionUrl)) ? originUrl : productionUrl;

    // Validate redirect URL if provided (prevent open redirect attacks)
    let successUrl: string;
    const defaultRedirectPath = '/dashboard/organization';
    if (redirectUrl) {
      if (!isValidRedirectUrl(redirectUrl, productionUrl)) {
        logStep("Invalid redirect URL rejected", { redirectUrl: redirectUrl.substring(0, 100) });
        // Fall back to default redirect on invalid URL
        successUrl = `${finalBaseUrl}${defaultRedirectPath}?qb_connected=true&realm_id=${realmId}`;
      } else {
        // Append success params to the provided redirect URL
        const separator = redirectUrl.includes('?') ? '&' : '?';
        successUrl = `${finalBaseUrl}${redirectUrl}${separator}qb_connected=true&realm_id=${realmId}`;
      }
    } else {
      successUrl = `${finalBaseUrl}${defaultRedirectPath}?qb_connected=true&realm_id=${realmId}`;
    }
    
    logStep("Redirecting to success URL", { successUrl: successUrl.substring(0, 100) });
    
    return Response.redirect(successUrl, 302);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("ERROR", { message: errorMessage, stack: errorStack });

    // Get production URL for error redirect
    // Use generic error message to prevent information exposure
    const productionUrl = Deno.env.get("PRODUCTION_URL") || "https://equipqr.app";
    const errorUrl = `${productionUrl}/dashboard/organization?error=oauth_failed&error_description=${encodeURIComponent("Failed to connect QuickBooks. Please try again.")}`;
    
    return Response.redirect(errorUrl, 302);
  }
});
