// Using Deno.serve (built-in)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  QBO_API_BASE,
  QBO_TOKEN_URL,
  getIntuitTid,
  withMinorVersion,
} from "../_shared/quickbooks-config.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  // Avoid logging sensitive data
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
    delete safeDetails.refresh_token;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : '';
  console.log(`[QUICKBOOKS-SEARCH-CUSTOMERS] ${step}${detailsStr}`);
};

// getIntuitTid imported from _shared/quickbooks-config.ts

interface QuickBooksCredential {
  id: string;
  organization_id: string;
  realm_id: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
}

interface IntuitTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
}

interface QuickBooksCustomer {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    Country?: string;
    PostalCode?: string;
  };
  ShipAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    Country?: string;
    PostalCode?: string;
  };
  Active?: boolean;
}

interface CustomerQueryResponse {
  QueryResponse: {
    Customer?: QuickBooksCustomer[];
    maxResults?: number;
    startPosition?: number;
  };
  time: string;
}

/**
 * Refresh the access token if needed
 */
async function refreshTokenIfNeeded(
  credential: QuickBooksCredential,
  supabaseClient: any,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const now = new Date();
  const accessTokenExpiresAt = new Date(credential.access_token_expires_at);
  
  // If token is still valid for at least 5 minutes, use it
  if (accessTokenExpiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
    return credential.access_token;
  }

  logStep("Access token expired or expiring soon, refreshing...");

  // Check if refresh token is still valid
  const refreshTokenExpiresAt = new Date(credential.refresh_token_expires_at);
  if (refreshTokenExpiresAt <= now) {
    throw new Error("Refresh token has expired. Please reconnect QuickBooks.");
  }

  // Refresh the token
  const tokenRequestBody = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: credential.refresh_token,
  });

  const basicAuth = btoa(`${clientId}:${clientSecret}`);
  
  const tokenResponse = await fetch(QBO_TOKEN_URL, {
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
    console.error("Token refresh failed:", tokenResponse.status, errorText);
    throw new Error("Failed to refresh QuickBooks access token");
  }

  const tokenData: IntuitTokenResponse = await tokenResponse.json();

  // Update credentials in database
  const newAccessExpiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);
  const newRefreshExpiresAt = new Date(now.getTime() + tokenData.x_refresh_token_expires_in * 1000);

  const { error: updateError } = await supabaseClient
    .from('quickbooks_credentials')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      access_token_expires_at: newAccessExpiresAt.toISOString(),
      refresh_token_expires_at: newRefreshExpiresAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', credential.id);

  if (updateError) {
    console.error("Failed to update credentials after refresh:", updateError);
    // Continue with the new token even if database update fails
  }

  logStep("Token refreshed successfully");
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

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
      throw new Error("QuickBooks OAuth is not configured");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }

    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Unauthorized" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Verify the user's token
    const token = authHeader.substring(7).trim();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      logStep("Authentication failed", { error: userError?.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Unauthorized" 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await req.json();
    const { organization_id, query } = body;

    if (!organization_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "organization_id is required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Request validated", { organizationId: organization_id, hasQuery: !!query });

    // Verify user has QuickBooks management permission
    const { data: qbPermission, error: qbPermError } = await supabaseClient
      .rpc('can_user_manage_quickbooks', {
        p_user_id: user.id,
        p_organization_id: organization_id
      });

    if (qbPermError) {
      logStep("Error checking QuickBooks permission", { error: qbPermError.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to verify user permissions" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!qbPermission) {
      logStep("Permission denied", { userId: user.id, organizationId: organization_id });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "You do not have permission to access QuickBooks integration" 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get QuickBooks credentials for the organization
    const { data: credentials, error: credError } = await supabaseClient
      .from('quickbooks_credentials')
      .select('*')
      .eq('organization_id', organization_id)
      .single();

    if (credError || !credentials) {
      logStep("No QuickBooks credentials found", { organizationId: organization_id });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "QuickBooks is not connected. Please connect QuickBooks first." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get a valid access token (refresh if needed)
    const accessToken = await refreshTokenIfNeeded(
      credentials,
      supabaseClient,
      clientId,
      clientSecret
    );

    // Build the QuickBooks Customer query
    let customerQuery = "SELECT * FROM Customer WHERE Active = true";
    if (query && query.trim()) {
      // Whitelist: allow only alphanumeric, spaces, hyphens, periods, commas, apostrophes
      // This prevents QuickBooks Query Language injection via special characters
      const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s\-.,']/g, "").trim();

      // Reject excessively long search queries
      if (sanitizedQuery.length > 100) {
        return new Response(JSON.stringify({
          success: false,
          error: "Search query too long"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (sanitizedQuery.length > 0) {
        // Escape single quotes for the QuickBooks query (defense-in-depth)
        const escapedQuery = sanitizedQuery.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        customerQuery = `SELECT * FROM Customer WHERE Active = true AND (DisplayName LIKE '%${escapedQuery}%' OR CompanyName LIKE '%${escapedQuery}%')`;
      }
    }
    customerQuery += " MAXRESULTS 100";

    logStep("Querying QuickBooks customers", { realmId: credentials.realm_id });

    // Call QuickBooks API (with minorversion for full field support)
    const qbResponse = await fetch(
      withMinorVersion(`${QBO_API_BASE}/v3/company/${credentials.realm_id}/query?query=${encodeURIComponent(customerQuery)}`),
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    // Capture intuit_tid from response headers for troubleshooting
    const intuitTid = getIntuitTid(qbResponse);

    if (!qbResponse.ok) {
      const errorText = await qbResponse.text();
      console.error("QuickBooks API error:", qbResponse.status, errorText);
      logStep("QuickBooks API error", { status: qbResponse.status, intuit_tid: intuitTid });
      
      // Handle specific error cases
      if (qbResponse.status === 401) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "QuickBooks authentication failed. Please reconnect QuickBooks." 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error("Failed to query QuickBooks customers");
    }

    const qbData: CustomerQueryResponse = await qbResponse.json();

    // Check for Fault in 200 OK response (QBO best practice)
    // QBO can return HTTP 200 with a Fault body instead of query results
    if ((qbData as unknown as Record<string, unknown>).Fault) {
      const faultObj = (qbData as unknown as Record<string, unknown>).Fault as Record<string, unknown>;
      // Only log non-sensitive fault metadata (type + error codes); avoid raw message/detail
      const errorCodes = Array.isArray(faultObj?.Error)
        ? (faultObj.Error as Array<Record<string, unknown>>).map(e => ({ code: e?.code }))
        : [];
      logStep("Fault in customer query response", { type: faultObj?.type, errorCodes, intuit_tid: intuitTid });
      // Return 422 instead of throwing to the catch block (which returns 500).
      // This is a validation/query error from QBO, not an internal server error.
      // Uses the request-scoped corsHeaders (origin-validated) for consistency
      // with all other responses in this function — not createErrorResponse,
      // which applies the wildcard CORS headers.
      return new Response(JSON.stringify({
        success: false,
        error: "QuickBooks returned a validation error for the customer query. Please adjust your search and try again.",
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customers = qbData.QueryResponse.Customer || [];

    logStep("Customers fetched successfully", { count: customers.length, intuit_tid: intuitTid });

    // Return simplified customer list
    const simplifiedCustomers = customers.map(c => ({
      Id: c.Id,
      DisplayName: c.DisplayName,
      CompanyName: c.CompanyName,
      Email: c.PrimaryEmailAddr?.Address,
      Phone: c.PrimaryPhone?.FreeFormNumber,
      BillAddr: c.BillAddr ? {
        Line1: c.BillAddr.Line1,
        City: c.BillAddr.City,
        State: c.BillAddr.CountrySubDivisionCode,
        Country: c.BillAddr.Country,
        PostalCode: c.BillAddr.PostalCode,
      } : undefined,
      ShipAddr: c.ShipAddr ? {
        Line1: c.ShipAddr.Line1,
        City: c.ShipAddr.City,
        State: c.ShipAddr.CountrySubDivisionCode,
        Country: c.ShipAddr.Country,
        PostalCode: c.ShipAddr.PostalCode,
      } : undefined,
    }));

    return new Response(JSON.stringify({ 
      success: true, 
      customers: simplifiedCustomers 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    // Log detailed error server-side only - never expose to client
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    // Return generic error message to user to prevent information leakage
    return new Response(JSON.stringify({ 
      success: false, 
      error: "An error occurred while searching customers. Please try again or contact support."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
