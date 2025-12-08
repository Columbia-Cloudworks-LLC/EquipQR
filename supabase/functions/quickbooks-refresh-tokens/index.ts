import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  // Avoid logging sensitive data like tokens
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
    delete safeDetails.refresh_token;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : '';
  console.log(`[QUICKBOOKS-REFRESH-TOKENS] ${step}${detailsStr}`);
};

// Helper function to create unauthorized error responses
const createUnauthorizedResponse = (message: string) => {
  return new Response(JSON.stringify({ 
    success: false,
    error: message
  }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};

// Intuit OAuth endpoints
const INTUIT_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

// Refresh tokens that expire within this many minutes
const REFRESH_WINDOW_MINUTES = 15;

interface IntuitTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  scope?: string;
}

interface QuickBooksCredential {
  id: string;
  organization_id: string;
  realm_id: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
  scopes: string;
}

interface RefreshResult {
  organizationId: string;
  realmId: string;
  success: boolean;
  error?: string;
}

async function refreshToken(
  credential: QuickBooksCredential,
  clientId: string,
  clientSecret: string
): Promise<{ success: boolean; newTokens?: IntuitTokenResponse; error?: string }> {
  try {
    const tokenRequestBody = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credential.refresh_token,
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
      // Sanitize error text - truncate and log full details server-side only
      // Log full error server-side for debugging
      console.error(`[QUICKBOOKS-REFRESH] Token refresh failed: ${tokenResponse.status}`, {
        statusText: tokenResponse.statusText,
        errorText: errorText // Full error logged server-side only
      });
      // Return generic error message to prevent information exposure
      return { 
        success: false, 
        error: `Token refresh failed (status: ${tokenResponse.status})` 
      };
    }

    const tokenData: IntuitTokenResponse = await tokenResponse.json();
    return { success: true, newTokens: tokenData };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get environment variables
    const clientId = Deno.env.get("INTUIT_CLIENT_ID");
    const clientSecret = Deno.env.get("INTUIT_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!clientId || !clientSecret) {
      logStep("ERROR", { message: "Missing INTUIT_CLIENT_ID or INTUIT_CLIENT_SECRET" });
      throw new Error("QuickBooks OAuth is not configured");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }

    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR", { message: "No authorization header provided" });
      return createUnauthorizedResponse("Unauthorized: No authorization header provided");
    }

    // Validate Authorization header format
    // Note: Bearer tokens are defined in RFC 6750. While the standard uses 'Bearer' with 
    // capital B, we check case-insensitively for robustness.
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      logStep("ERROR", { message: "Invalid authorization header format" });
      return createUnauthorizedResponse("Unauthorized: Invalid authorization header format");
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Extract and verify the JWT token
    // Note: Using service role client is intentional here - it's needed to verify
    // service role tokens sent by the cron job, while still validating user tokens
    // Extract token after 'bearer ' prefix (7 characters)
    const token = authHeader.substring(7).trim();
    if (!token) {
      logStep("ERROR", { message: "Empty token in authorization header" });
      return createUnauthorizedResponse("Unauthorized: Empty token");
    }
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      logStep("ERROR", { message: "Authentication error", error: userError.message });
      return createUnauthorizedResponse("Unauthorized: Invalid or expired token");
    }

    // Token is valid - log authentication success without exposing user identifiers
    logStep("Request authenticated successfully");

    // Calculate the threshold time for tokens that need refresh
    // Refresh tokens that will expire within the next REFRESH_WINDOW_MINUTES
    const now = new Date();
    const refreshThreshold = new Date(now.getTime() + REFRESH_WINDOW_MINUTES * 60 * 1000);

    logStep("Querying credentials needing refresh", { 
      refreshThreshold: refreshThreshold.toISOString(),
      windowMinutes: REFRESH_WINDOW_MINUTES
    });

    // Query credentials that need refresh
    // Only refresh tokens where:
    // 1. Access token expires within the threshold
    // 2. Refresh token has NOT expired yet
    const { data: credentials, error: queryError } = await supabaseClient
      .from('quickbooks_credentials')
      .select('id, organization_id, realm_id, refresh_token, access_token_expires_at, refresh_token_expires_at, scopes')
      .lt('access_token_expires_at', refreshThreshold.toISOString())
      .gt('refresh_token_expires_at', now.toISOString());

    if (queryError) {
      logStep("Failed to query credentials", { error: queryError.message });
      throw new Error(`Failed to query credentials: ${queryError.message}`);
    }

    if (!credentials || credentials.length === 0) {
      logStep("No credentials need refresh");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No tokens need refresh",
        refreshed: 0,
        failed: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep(`Found ${credentials.length} credentials needing refresh`);

    // Process credentials in parallel for better performance
    const refreshPromises = credentials.map(async (credential): Promise<RefreshResult> => {
      logStep("Refreshing token", { 
        organizationId: credential.organization_id, 
        realmId: credential.realm_id 
      });

      const refreshResult = await refreshToken(credential, clientId, clientSecret);

      if (refreshResult.success && refreshResult.newTokens) {
        // Calculate new expiration timestamps
        const newAccessExpiresAt = new Date(now.getTime() + refreshResult.newTokens.expires_in * 1000);
        const newRefreshExpiresAt = new Date(now.getTime() + refreshResult.newTokens.x_refresh_token_expires_in * 1000);

        // Update the credential in the database
        const { error: updateError } = await supabaseClient
          .from('quickbooks_credentials')
          .update({
            access_token: refreshResult.newTokens.access_token,
            refresh_token: refreshResult.newTokens.refresh_token,
            access_token_expires_at: newAccessExpiresAt.toISOString(),
            refresh_token_expires_at: newRefreshExpiresAt.toISOString(),
            token_type: refreshResult.newTokens.token_type || 'bearer',
            scopes: refreshResult.newTokens.scope || credential.scopes,
            updated_at: now.toISOString(),
          })
          .eq('id', credential.id);

        if (updateError) {
          logStep("Failed to update credential", { 
            organizationId: credential.organization_id,
            realmId: credential.realm_id,
            error: updateError.message 
          });
          return {
            organizationId: credential.organization_id,
            realmId: credential.realm_id,
            success: false,
            error: "Database update failed" // Generic error to prevent information exposure
          };
        } else {
          logStep("Token refreshed successfully", { 
            organizationId: credential.organization_id,
            realmId: credential.realm_id,
            newAccessExpiresAt: newAccessExpiresAt.toISOString()
          });
          return {
            organizationId: credential.organization_id,
            realmId: credential.realm_id,
            success: true
          };
        }
      } else {
        logStep("Token refresh failed", { 
          organizationId: credential.organization_id,
          realmId: credential.realm_id,
          error: refreshResult.error 
        });
        return {
          organizationId: credential.organization_id,
          realmId: credential.realm_id,
          success: false,
          error: refreshResult.error
        };
      }
    });

    // Wait for all refresh operations to complete
    const results = await Promise.allSettled(refreshPromises);
    
    // Extract results, handling both fulfilled and rejected promises
    const processedResults: RefreshResult[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // If the promise itself was rejected (shouldn't happen, but handle gracefully)
        const credential = credentials[index];
        const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
        logStep("Unexpected error processing credential", {
          organizationId: credential.organization_id,
          realmId: credential.realm_id,
          error: errorMessage
        });
        return {
          organizationId: credential.organization_id,
          realmId: credential.realm_id,
          success: false,
          error: "An unexpected error occurred while refreshing tokens" // Generic error to prevent information exposure
        };
      }
    });

    // Summarize results
    const refreshed = processedResults.filter(r => r.success).length;
    const failed = processedResults.filter(r => !r.success).length;

    logStep("Refresh complete", { refreshed, failed, total: credentials.length });

    return new Response(JSON.stringify({ 
      success: true,
      message: `Processed ${credentials.length} credentials`,
      refreshed,
      failed,
      results: processedResults
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("ERROR", { message: errorMessage, stack: errorStack });

    // Return generic error message to prevent information exposure
    return new Response(JSON.stringify({ 
      success: false,
      error: "An unexpected error occurred while refreshing tokens"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
