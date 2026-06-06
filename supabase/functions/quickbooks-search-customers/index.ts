// Using Deno.serve (built-in)
import {
  QBO_API_BASE,
  getIntuitTid,
  withMinorVersion,
} from "../_shared/quickbooks-config.ts";
import { requireBearerUserJsonUnauthorized } from "../_shared/supabase-clients.ts";
import { MissingSecretError } from "../_shared/require-secret.ts";
import { serveQuickBooksFunction } from "../_shared/quickbooks-serve.ts";
import { createRedactedLogStep } from "../_shared/redacted-logger.ts";
import {
  refreshQuickBooksAccessTokenIfNeeded,
  type QuickBooksCredential,
} from "../_shared/quickbooks-token.ts";

const FUNCTION_NAME = "quickbooks-search-customers";

const logStep = createRedactedLogStep("QUICKBOOKS-SEARCH-CUSTOMERS");

// getIntuitTid imported from _shared/quickbooks-config.ts

interface QuickBooksCustomer {
  Id: string;
  DisplayName: string;
  GivenName?: string;
  FamilyName?: string;
  CompanyName?: string;
  Taxable?: boolean;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  Mobile?: { FreeFormNumber: string };
  Fax?: { FreeFormNumber: string };
  AlternatePhone?: { FreeFormNumber: string };
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

import { buildQBOContacts } from "./qbo-contacts.ts";
export { buildQBOContacts } from "./qbo-contacts.ts";

interface CustomerQueryResponse {
  QueryResponse: {
    Customer?: QuickBooksCustomer[];
    maxResults?: number;
    startPosition?: number;
  };
  time: string;
}

serveQuickBooksFunction(FUNCTION_NAME, logStep, async ({
  req,
  ctx,
  corsHeaders,
  secrets,
  supabaseClient,
}) => {
  try {
    const { clientId, clientSecret } = secrets;

    const authResult = await requireBearerUserJsonUnauthorized(
      req,
      supabaseClient,
      corsHeaders,
    );
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user } = authResult;

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

    const { accessToken } = await refreshQuickBooksAccessTokenIfNeeded(
      credentials as QuickBooksCredential,
      supabaseClient,
      clientId,
      clientSecret,
      { onPersistError: "logAndContinue", log: logStep },
    );

    // Build the QuickBooks Customer query — include all documented contact fields
    let customerQuery = "SELECT Id, DisplayName, GivenName, FamilyName, CompanyName, PrimaryEmailAddr, PrimaryPhone, Mobile, Fax, AlternatePhone, BillAddr, ShipAddr, Taxable FROM Customer WHERE Active = true";
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
        customerQuery = `SELECT Id, DisplayName, GivenName, FamilyName, CompanyName, PrimaryEmailAddr, PrimaryPhone, Mobile, Fax, AlternatePhone, BillAddr, ShipAddr, Taxable FROM Customer WHERE Active = true AND (DisplayName LIKE '%${escapedQuery}%' OR CompanyName LIKE '%${escapedQuery}%')`;
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

    // Return simplified customer list with documented contact fields and normalized contacts
    const simplifiedCustomers = customers.map(c => ({
      Id: c.Id,
      DisplayName: c.DisplayName,
      GivenName: c.GivenName,
      FamilyName: c.FamilyName,
      CompanyName: c.CompanyName,
      Taxable: c.Taxable,
      // Backward-compatible flat fields
      Email: c.PrimaryEmailAddr?.Address,
      Phone: c.PrimaryPhone?.FreeFormNumber,
      Mobile: c.Mobile?.FreeFormNumber,
      Fax: c.Fax?.FreeFormNumber,
      AlternatePhone: c.AlternatePhone?.FreeFormNumber,
      // Normalized contact entries for UI display and DB sync
      contacts: buildQBOContacts(c),
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
    if (!(error instanceof MissingSecretError)) {
      logStep("ERROR", { message: errorMessage, correlation_id: ctx.correlationId });
    }

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
