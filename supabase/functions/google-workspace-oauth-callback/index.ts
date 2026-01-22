import { encryptToken, getTokenEncryptionKey } from "../_shared/crypto.ts";
import { createAdminSupabaseClient } from "../_shared/supabase-clients.ts";

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

interface GoogleUserInfo {
  email: string;
  email_verified?: boolean;
  hd?: string; // hosted domain
}

interface GoogleAdminUserInfo {
  primaryEmail: string;
  isAdmin?: boolean;
  isDelegatedAdmin?: boolean;
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";

// OAuth state validation constants
// STATE_TTL_MS: Maximum age of OAuth state parameter (15 minutes)
// MAX_CLOCK_SKEW_MS: Tolerance for clock drift between servers (2 minutes)
const STATE_TTL_MS = 15 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 2 * 60 * 1000;

/**
 * This mirrors the SQL normalize_domain() function for non-null inputs.
 * Expects a defined domain string; callers should provide a fallback if needed.
 */
function normalizeDomain(domain: string): string {
  return domain.toLowerCase().trim();
}

/**
 * Validates that an email address is well-formed.
 * 
 * Uses a regex pattern to ensure:
 * - At least one non-whitespace, non-@ character before @
 * - Exactly one @ symbol
 * - At least one non-whitespace, non-@ character after @
 * - At least one dot after @
 * - At least one character after the dot
 * 
 * This prevents malformed emails like:
 * - @domain.com (missing local part)
 * - user@@domain.com (multiple @ symbols)
 * - user@ (missing domain)
 * - @domain (missing local part and TLD)
 * 
 * @param email - The email address to validate
 * @returns true if the email is well-formed, false otherwise
 */
function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  // Regex pattern matching the frontend validation: /[^\s@]+@[^\s@]+\.[^\s@]+/
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


/**
 * Checks if we're running in a production environment.
 * In production, localhost redirects should not be allowed.
 */
function isProductionEnvironment(): boolean {
  const productionUrl = Deno.env.get("PRODUCTION_URL");
  // If PRODUCTION_URL is set and doesn't contain localhost, we're in production
  return !!productionUrl && !productionUrl.includes("localhost");
}

/**
 * Checks if this is a preview/staging environment (not production).
 * Preview environments allow additional trusted domains like Vercel preview URLs.
 */
function isPreviewEnvironment(): boolean {
  const productionUrl = Deno.env.get("PRODUCTION_URL") || "";
  // If PRODUCTION_URL contains "preview" in the hostname, we're in preview/staging
  return productionUrl.includes("preview.");
}

function isValidRedirectUrl(urlToValidate: string | null, productionUrl: string): boolean {
  if (!urlToValidate) return true;

  try {
    if (urlToValidate.startsWith("/") && !urlToValidate.startsWith("//")) {
      return true;
    }

    const url = new URL(urlToValidate);
    const productionDomain = new URL(productionUrl).hostname;

    // In production, only allow the production domain
    // localhost/127.0.0.1 are ONLY allowed in non-production environments
    const isProduction = isProductionEnvironment();
    const isPreview = isPreviewEnvironment();
    
    // Build list of allowed domains
    const allowedDomains = isProduction
      ? [productionDomain]
      : [productionDomain, "localhost", "127.0.0.1"];
    
    // In preview environments, also allow Vercel preview deployment URLs
    // These are trusted since they're deployed by our CI/CD pipeline
    const allowedSuffixes = isPreview ? [".vercel.app"] : [];

    for (const domain of allowedDomains) {
      if (domain.startsWith(".")) {
        if (url.hostname.endsWith(domain) || url.hostname === domain.slice(1)) {
          return true;
        }
      } else if (url.hostname === domain) {
        return true;
      }
    }
    
    // Check suffix-based allowed domains (e.g., *.vercel.app)
    for (const suffix of allowedSuffixes) {
      if (url.hostname.endsWith(suffix)) {
        return true;
      }
    }

    logStep("Redirect URL validation failed", {
      redirectUrl: urlToValidate.substring(0, 100),
      hostname: url.hostname,
      productionDomain,
      isProduction,
      isPreview,
    });
    return false;
  } catch {
    logStep("Redirect URL is malformed", { redirectUrl: urlToValidate.substring(0, 100) });
    return false;
  }
}

/**
 * Validates that a URL is from a trusted domain to prevent open redirect attacks.
 * Only allows URLs from equipqr.app and its subdomains.
 * 
 * @param urlString - The URL string to validate
 * @returns true if the URL is from a trusted domain, false otherwise
 */
function isTrustedDomain(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    // Allow exact match for equipqr.app
    if (hostname === "equipqr.app") {
      return true;
    }
    
    // Allow subdomains of equipqr.app (e.g., preview.equipqr.app, staging.equipqr.app)
    if (hostname.endsWith(".equipqr.app")) {
      return true;
    }
    
    // In non-production, also allow localhost for development
    if (!isProductionEnvironment()) {
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return true;
      }
    }
    
    return false;
  } catch {
    // Invalid URL format
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { method: req.method });

    const clientId = Deno.env.get("GOOGLE_WORKSPACE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_WORKSPACE_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const productionUrl = Deno.env.get("PRODUCTION_URL");
    const oauthRedirectBaseUrl = Deno.env.get("GW_OAUTH_REDIRECT_BASE_URL") || supabaseUrl;

    // PRODUCTION_URL must be set in production to prevent redirect URL validation issues.
    // The fallback is only used for development/testing environments.
    if (!productionUrl) {
      logStep("WARNING: PRODUCTION_URL not set, using fallback", { fallback: "https://equipqr.app" });
    }
    const resolvedProductionUrl = productionUrl || "https://equipqr.app";

    if (!clientId || !clientSecret) {
      logStep("ERROR", { message: "Missing GOOGLE_WORKSPACE_CLIENT_ID or GOOGLE_WORKSPACE_CLIENT_SECRET" });
      const rawProductionUrl = Deno.env.get("PRODUCTION_URL") || "https://equipqr.app";
      // Validate PRODUCTION_URL to prevent open redirect attacks
      const fallbackProductionUrl = isTrustedDomain(rawProductionUrl)
        ? rawProductionUrl
        : "https://equipqr.app";
      const errorCode = "oauth_failed";
      const userMessage =
        "Google Workspace OAuth is not configured. Please contact your administrator.";
      const errorUrl = `${fallbackProductionUrl}/dashboard/onboarding/workspace?gw_error=${encodeURIComponent(
        errorCode,
      )}&gw_error_description=${encodeURIComponent(userMessage)}`;
      return Response.redirect(errorUrl, 302);
    }

    if (!supabaseUrl) {
      throw new Error("Supabase configuration is missing");
    }

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
      const errorUrl = `${resolvedProductionUrl}/dashboard/onboarding/workspace?gw_error=${encodeURIComponent(error)}&gw_error_description=${encodeURIComponent(userFriendlyError)}`;
      return Response.redirect(errorUrl, 302);
    }

    if (!code) {
      throw new Error("Missing authorization code");
    }

    if (!stateParam) {
      throw new Error("Missing state parameter");
    }

    let state: OAuthState;
    try {
      state = JSON.parse(atob(stateParam));
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

    // Validate state timestamp using module-level constants
    // This prevents replay attacks while allowing for reasonable clock drift between
    // the client, this server, and Google's servers.
    const ageMs = nowMs - stateTimestamp;

    // Security note (timing-safe validation): Both validation paths below perform similar
    // operations (logging context + throwing generic error) to prevent timing analysis attacks.
    // An attacker cannot distinguish between "too far in future" vs "expired" based on response
    // time because both paths have equivalent execution cost. The generic error messages also
    // avoid leaking which validation failed.

    // Reject timestamps more than MAX_CLOCK_SKEW_MS in the future (beyond clock skew tolerance).
    // A negative age means the state timestamp is ahead of server time; we allow small
    // negative values to handle clock drift, but reject anything too far in the future.
    // Use a single generic log message for both validation paths to ensure truly equivalent
    // timing characteristics and prevent side-channel timing analysis.
    if (ageMs < -MAX_CLOCK_SKEW_MS) {
      logStep("OAuth state timestamp validation failed", { ageMs });
      throw new Error("OAuth state has an invalid timestamp. Please try again.");
    }

    // Reject expired timestamps (older than TTL)
    // If age is positive (state is in the past), it must be within STATE_TTL_MS
    // Use the same generic log message as the future timestamp case to maintain
    // consistent timing characteristics between both validation paths.
    if (ageMs > STATE_TTL_MS) {
      logStep("OAuth state timestamp validation failed", { ageMs });
      throw new Error("OAuth state has expired. Please try again.");
    }

    // Use centralized admin client for consistency with other Edge Functions
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

    const redirectBaseUrl = oauthRedirectBaseUrl.trim().replace(/\/+$/, "");
    const redirectUri = `${redirectBaseUrl}/functions/v1/google-workspace-oauth-callback`;

    // Validate redirect_uri against allowlist to prevent redirect manipulation attacks.
    // We use exact URL matching with hostname validation to prevent:
    // 1. Path traversal attacks (e.g., "base/callback/../evil")
    // 2. Subdomain attacks (e.g., attacker controls "evil.supabase.co")
    const expectedCallbackPath = "/functions/v1/google-workspace-oauth-callback";
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
        `Invalid OAuth redirect URI format. Expected an absolute URL ending with "${expectedCallbackPath}" (e.g., "https://<your-domain>${expectedCallbackPath}") but got "${redirectUri}". Parse error: ${parseError}`,
      );
    }

    // Build allowlist with both full URIs and parsed hostnames for validation
    const allowedRedirectUris = allowedBaseUrls.map((base) => base + expectedCallbackPath);
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
    const isPathCorrect = parsedRedirectUri.pathname === expectedCallbackPath;

    if (!isUriExactMatch || !isHostnameAllowed || !isPathCorrect) {
      // Log only hostname and pathname to avoid exposing sensitive query parameters or tokens
      // that an attacker might inject into the redirectUri
      logStep("ERROR: redirect_uri validation failed", {
        hostname: parsedRedirectUri.hostname,
        pathname: parsedRedirectUri.pathname,
        allowedHostnames: Array.from(allowedHostnames),
        expectedPath: expectedCallbackPath,
      });
      throw new Error("Invalid OAuth redirect configuration");
    }

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
      // Log the actual error from Google to diagnose the issue
      let googleError: { error?: string; error_description?: string } = {};
      try {
        googleError = await tokenResponse.json();
      } catch {
        // Response wasn't JSON
      }
      logStep("Token exchange failed", {
        status: tokenResponse.status,
        error: googleError.error || "unknown",
        error_description: googleError.error_description || "no description",
        redirect_uri_used: redirectUri,
        client_id_prefix: clientId?.substring(0, 20) + "...",
      });
      
      // Provide more specific error message based on Google's response
      let userMessage = "Failed to exchange authorization code. Please try again.";
      if (googleError.error === "redirect_uri_mismatch") {
        userMessage = "OAuth configuration error: redirect URI mismatch. Please contact support.";
      } else if (googleError.error === "invalid_client") {
        userMessage = "OAuth configuration error: invalid client credentials. Please contact support.";
      } else if (googleError.error === "invalid_grant") {
        userMessage = "Authorization code expired or already used. Please try again.";
      }
      
      throw new Error(userMessage);
    }

    const tokenData: GoogleTokenResponse = await tokenResponse.json();
    logStep("Token exchange successful", {
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
    });

    const now = new Date();
    const accessTokenExpiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);

    // ==========================================================================
    // Step 1: Get user info from Google to determine email and domain
    // ==========================================================================
    const userinfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    if (!userinfoResponse.ok) {
      logStep("Failed to fetch user info", { status: userinfoResponse.status });
      throw new Error("Failed to verify your Google account. Please try again.");
    }

    const userinfo: GoogleUserInfo = await userinfoResponse.json();
    const userEmail = userinfo.email;
    
    // Validate email format before extracting domain. This validates that the email
    // is well-formed to prevent undefined domain extraction from malformed emails.
    if (!isValidEmail(userEmail)) {
      throw new Error("Invalid email format received from Google. Please try again.");
    }
    
    // Safely extract domain from email with explicit check for split result
    const emailParts = userEmail.split("@");
    const emailDomain = emailParts.length === 2 ? emailParts[1] : "";
    const userDomain = userinfo.hd || emailDomain;
    
    // Defensive check: ensure we have a valid domain after extraction
    if (!userDomain) {
      throw new Error("Could not determine your organization domain. Please try again.");
    }

    logStep("User info retrieved", { email: userEmail, domain: userDomain });

    // Block consumer domains
    if (["gmail.com", "googlemail.com"].includes(userDomain.toLowerCase())) {
      throw new Error("Consumer Google accounts (gmail.com) cannot use Google Workspace integration.");
    }

    // ==========================================================================
    // Step 2: Verify user is a Google Workspace admin via Admin SDK
    // ==========================================================================
    const adminCheckResponse = await fetch(
      `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(userEmail)}`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    if (!adminCheckResponse.ok) {
      const errorStatus = adminCheckResponse.status;
      logStep("Admin API check failed", { status: errorStatus });
      
      if (errorStatus === 403) {
        throw new Error(
          "Unable to verify admin status. Please ensure you granted the required permissions " +
          "and that you are a Google Workspace administrator."
        );
      }
      throw new Error("Failed to verify Google Workspace admin status. Please try again.");
    }

    const adminUserInfo: GoogleAdminUserInfo = await adminCheckResponse.json();
    const isWorkspaceAdmin = adminUserInfo.isAdmin === true || adminUserInfo.isDelegatedAdmin === true;

    logStep("Admin status checked", { 
      isAdmin: adminUserInfo.isAdmin, 
      isDelegatedAdmin: adminUserInfo.isDelegatedAdmin,
      isWorkspaceAdmin,
    });

    if (!isWorkspaceAdmin) {
      throw new Error(
        "Only Google Workspace administrators can connect their organization to EquipQR. " +
        "Please contact your Workspace admin to set up EquipQR for your organization."
      );
    }

    // ==========================================================================
    // Step 3: Auto-provision organization if domain not already claimed
    // ==========================================================================
    const domain = normalizeDomain(userDomain);
    let effectiveOrgId = organizationId;

    // Check if this domain already has an organization
    const { data: existingDomainData } = await supabaseClient
      .from("workspace_domains")
      .select("organization_id, domain")
      .eq("domain", domain)
      .maybeSingle();

    if (existingDomainData?.organization_id) {
      // Domain already claimed - use existing organization
      effectiveOrgId = existingDomainData.organization_id;
      logStep("Using existing organization for domain", { 
        domain, 
        organizationId: effectiveOrgId,
      });
    } else if (!organizationId) {
      // First-time setup: auto-provision new organization
      // Generate organization name from domain (e.g., "acme.com" -> "Acme")
      const domainParts = domain.split(".");
      const primaryPart = domainParts.find((part) => part.length > 0) ?? "Workspace";
      const orgNameBase = primaryPart.charAt(0).toUpperCase() + primaryPart.slice(1);
      const orgName = `${orgNameBase} Organization`;

      logStep("Auto-provisioning new organization", { domain, orgName });

      const { data: provisionData, error: provisionError } = await supabaseClient
        .rpc("auto_provision_workspace_organization", {
          p_user_id: session.user_id,
          p_domain: domain,
          p_organization_name: orgName,
        });

      if (provisionError) {
        logStep("Failed to provision organization", { error: provisionError.message });
        throw new Error("Failed to create organization. Please try again.");
      }

      if (!provisionData || provisionData.length === 0) {
        throw new Error("Failed to create organization. Please try again.");
      }

      effectiveOrgId = provisionData[0].organization_id;
      logStep("Organization provisioned", {
        organizationId: effectiveOrgId,
        alreadyExisted: provisionData[0].already_existed,
      });
    }

    if (!effectiveOrgId) {
      throw new Error("No organization available for this domain. Please try again.");
    }

    // ==========================================================================
    // Step 4: Store Google Workspace credentials
    // ==========================================================================
    let refreshToken = tokenData.refresh_token || null;
    if (!refreshToken) {
      // Look up existing credentials using normalized domain for consistency
      const { data: existingCreds } = await supabaseClient
        .from("google_workspace_credentials")
        .select("refresh_token")
        .eq("organization_id", effectiveOrgId)
        .eq("domain", domain)
        .maybeSingle();

      refreshToken = existingCreds?.refresh_token || null;
    }

    if (!refreshToken) {
      throw new Error("Google Workspace refresh token missing. Please reconnect.");
    }

    // Encrypt the refresh token before storing
    logStep("DEBUG: About to get encryption key");
    let encryptionKey: string;
    try {
      encryptionKey = getTokenEncryptionKey();
      logStep("DEBUG: Got encryption key", { keyLength: encryptionKey.length });
    } catch (keyError) {
      const keyErrorMsg = keyError instanceof Error ? keyError.message : String(keyError);
      logStep("DEBUG: Failed to get encryption key", { error: keyErrorMsg });
      throw new Error(`Encryption key error: ${keyErrorMsg}`);
    }

    let encryptedRefreshToken: string;
    try {
      encryptedRefreshToken = await encryptToken(refreshToken, encryptionKey);
      logStep("DEBUG: Refresh token encrypted", { encryptedLength: encryptedRefreshToken.length });
    } catch (encryptError) {
      const encryptErrorMsg = encryptError instanceof Error ? encryptError.message : String(encryptError);
      logStep("DEBUG: Encryption failed", { error: encryptErrorMsg });
      throw new Error(`Encryption failed: ${encryptErrorMsg}`);
    }

    // Upsert using the unique functional index on (organization_id, normalize_domain(domain)).
    //
    // IMPORTANT: We use the index name instead of column names because this is a
    // functional index (normalize_domain(domain)). Column-based onConflict resolution
    // cannot target expression indexes - PostgreSQL requires the exact index name
    // when the uniqueness constraint involves a function call. If you instead try to
    // use column names here (e.g. "organization_id,domain"), PostgreSQL will fail
    // the statement with an error similar to:
    //   "there is no unique or exclusion constraint matching the ON CONFLICT specification".
    logStep("DEBUG: About to upsert credentials", {
      organization_id: effectiveOrgId,
      domain: domain,
      access_token_expires_at: accessTokenExpiresAt.toISOString(),
      scopes: tokenData.scope || null,
    });

    // Manual upsert: The functional index on (organization_id, normalize_domain(domain))
    // cannot be used with Supabase JS client's onConflict (it only supports column names).
    // So we first check if a record exists, then update or insert accordingly.
    const { data: existingRecord, error: selectError } = await supabaseClient
      .from("google_workspace_credentials")
      .select("id")
      .eq("organization_id", effectiveOrgId)
      .eq("domain", normalizeDomain(domain))
      .maybeSingle();

    if (selectError) {
      logStep("DEBUG: Select for upsert failed", { 
        error: selectError.message, 
        code: selectError.code,
      });
      throw new Error(`DB select error: ${selectError.code}; ${selectError.message}`);
    }

    let upsertError: { message: string; code?: string; details?: string; hint?: string } | null = null;

    if (existingRecord) {
      // Update existing record
      logStep("DEBUG: Updating existing credentials record", { id: existingRecord.id });
      const { error } = await supabaseClient
        .from("google_workspace_credentials")
        .update({
          refresh_token: encryptedRefreshToken,
          access_token_expires_at: accessTokenExpiresAt.toISOString(),
          scopes: tokenData.scope || null,
          updated_at: now.toISOString(),
        })
        .eq("id", existingRecord.id);
      upsertError = error;
    } else {
      // Insert new record
      logStep("DEBUG: Inserting new credentials record");
      const { error } = await supabaseClient
        .from("google_workspace_credentials")
        .insert({
          organization_id: effectiveOrgId,
          domain: normalizeDomain(domain),
          refresh_token: encryptedRefreshToken,
          access_token_expires_at: accessTokenExpiresAt.toISOString(),
          scopes: tokenData.scope || null,
          updated_at: now.toISOString(),
        });
      upsertError = error;
    }

    if (upsertError) {
      logStep("DEBUG: Upsert failed", { 
        error: upsertError.message, 
        code: upsertError.code,
        details: upsertError.details,
        hint: upsertError.hint,
      });
      // Include error details in the message so they appear in the redirect URL for debugging
      const errorDetails = [
        upsertError.code && `code=${upsertError.code}`,
        upsertError.message,
        upsertError.hint && `hint: ${upsertError.hint}`,
      ].filter(Boolean).join('; ');
      throw new Error(`DB error: ${errorDetails}`);
    }
    
    logStep("DEBUG: Credentials stored successfully");

    const isOriginValid = !!originUrl && isValidRedirectUrl(originUrl, resolvedProductionUrl);
    const finalBaseUrl = (isOriginValid ? originUrl : resolvedProductionUrl).replace(/\/+$/, "");
    const defaultRedirectPath = "/dashboard/onboarding/workspace";

    let successUrl: string;
    if (redirectUrl) {
      if (!isValidRedirectUrl(redirectUrl, resolvedProductionUrl)) {
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
    const rawProductionUrl = Deno.env.get("PRODUCTION_URL") || "https://equipqr.app";
    // Validate PRODUCTION_URL to prevent open redirect attacks
    const fallbackProductionUrl = isTrustedDomain(rawProductionUrl)
      ? rawProductionUrl
      : "https://equipqr.app";
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    // Determine error type for better frontend handling using structured error properties
    const typedError = error as { code?: string; name?: string } | null | undefined;
    const isNotAdminError =
      !!typedError &&
      (typedError.code === "not_workspace_admin" ||
        typedError.name === "NotWorkspaceAdminError");
    const errorCode = isNotAdminError ? "not_workspace_admin" : "oauth_failed";

    // Use the actual error message for user-facing display
    const userMessage =
      errorMessage || "Failed to connect Google Workspace. Please try again.";
    const errorUrl = `${fallbackProductionUrl}/dashboard/onboarding/workspace?gw_error=${encodeURIComponent(
      errorCode,
    )}&gw_error_description=${encodeURIComponent(userMessage)}`;
    return Response.redirect(errorUrl, 302);
  }
});

