/**
 * Export Work Orders to Google Sheets Edge Function
 * 
 * Creates a Google Sheets spreadsheet with work order data for organizations
 * that have connected their Google Workspace.
 * 
 * Uses the shared work-orders-export-data module for data fetching and row building.
 * Uses raw fetch to Google Sheets API to keep bundle size small.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createUserSupabaseClient,
  createAdminSupabaseClient,
  requireUser,
  verifyOrgAdmin,
  createErrorResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  getGoogleWorkspaceAccessToken,
  GoogleWorkspaceTokenError,
  GOOGLE_SCOPES,
  hasScope,
} from "../_shared/google-workspace-token.ts";
import {
  fetchWorkOrdersWithData,
  buildAllRows,
  checkRateLimit,
  WORKSHEET_NAMES,
  WORKSHEET_HEADERS,
  summaryRowToArray,
  laborRowToArray,
  costRowToArray,
  pmRowToArray,
  timelineRowToArray,
  equipmentRowToArray,
  type ExportRequest,
  type AllExportRows,
} from "../_shared/work-orders-export-data.ts";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : "";
  console.log(`[EXPORT-TO-GOOGLE-SHEETS] ${step}${detailsStr}`);
};

// ============================================
// Google Sheets API Helpers
// ============================================

interface CreateSpreadsheetResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/**
 * Creates a new Google Sheets spreadsheet with multiple sheets.
 */
async function createSpreadsheet(
  accessToken: string,
  title: string,
  sheetNames: string[]
): Promise<CreateSpreadsheetResponse> {
  const body = {
    properties: {
      title,
    },
    sheets: sheetNames.map((name, index) => ({
      properties: {
        sheetId: index,
        title: name,
        index,
      },
    })),
  };

  const response = await fetch(SHEETS_API_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logStep("Failed to create spreadsheet", { status: response.status, error: errorBody });
    
    if (response.status === 403) {
      throw new GoogleWorkspaceTokenError(
        "Insufficient permissions. Please reconnect Google Workspace to grant Sheets access.",
        "insufficient_scopes"
      );
    }
    
    throw new Error(`Failed to create Google Sheets spreadsheet: ${response.status}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
  };
}

/**
 * Writes data to a specific sheet range using values:batchUpdate.
 */
async function writeSheetData(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  headers: readonly string[],
  rows: (string | number | boolean | null)[][]
): Promise<void> {
  // Combine headers and data rows
  const values = [
    headers,
    ...rows,
  ];

  const range = `'${sheetName}'!A1`;
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logStep("Failed to write sheet data", { sheetName, status: response.status, error: errorBody });
    
    if (response.status === 403) {
      throw new GoogleWorkspaceTokenError(
        "Insufficient permissions. Please reconnect Google Workspace to grant Sheets access.",
        "insufficient_scopes"
      );
    }
    
    throw new Error(`Failed to write data to sheet ${sheetName}: ${response.status}`);
  }
}

/**
 * Applies basic formatting to the spreadsheet (freeze header row, auto-resize columns).
 */
async function formatSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  sheetCount: number
): Promise<void> {
  const requests = [];

  // Freeze the first row for each sheet
  for (let i = 0; i < sheetCount; i++) {
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: i,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        fields: "gridProperties.frozenRowCount",
      },
    });

    // Bold the header row
    requests.push({
      repeatCell: {
        range: {
          sheetId: i,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              bold: true,
            },
          },
        },
        fields: "userEnteredFormat.textFormat.bold",
      },
    });
  }

  if (requests.length === 0) return;

  const url = `${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    // Formatting is non-critical, just log the error
    const errorBody = await response.text();
    logStep("Warning: Failed to format spreadsheet", { status: response.status, error: errorBody });
  }
}

/**
 * Populates all sheets in the spreadsheet with the export data.
 */
async function populateSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  allRows: AllExportRows
): Promise<void> {
  // Write Summary sheet
  await writeSheetData(
    accessToken,
    spreadsheetId,
    WORKSHEET_NAMES.SUMMARY,
    WORKSHEET_HEADERS.SUMMARY,
    allRows.summaryRows.map(summaryRowToArray)
  );

  // Write Labor Detail sheet
  await writeSheetData(
    accessToken,
    spreadsheetId,
    WORKSHEET_NAMES.LABOR,
    WORKSHEET_HEADERS.LABOR,
    allRows.laborRows.map(laborRowToArray)
  );

  // Write Materials & Costs sheet
  const costData = allRows.costRows.map(costRowToArray);
  // Add totals row
  if (costData.length > 0) {
    const totalQty = allRows.costRows.reduce((sum, r) => sum + r.quantity, 0);
    const totalCost = allRows.costRows.reduce((sum, r) => sum + r.totalPrice, 0);
    costData.push(['', '', '', 'TOTAL', totalQty, '', totalCost, '', '', '']);
  }
  await writeSheetData(
    accessToken,
    spreadsheetId,
    WORKSHEET_NAMES.COSTS,
    WORKSHEET_HEADERS.COSTS,
    costData
  );

  // Write PM Checklists sheet (if there's data)
  if (allRows.pmRows.length > 0) {
    await writeSheetData(
      accessToken,
      spreadsheetId,
      WORKSHEET_NAMES.PM_CHECKLISTS,
      WORKSHEET_HEADERS.PM_CHECKLISTS,
      allRows.pmRows.map(pmRowToArray)
    );
  }

  // Write Timeline sheet
  await writeSheetData(
    accessToken,
    spreadsheetId,
    WORKSHEET_NAMES.TIMELINE,
    WORKSHEET_HEADERS.TIMELINE,
    allRows.timelineRows.map(timelineRowToArray)
  );

  // Write Equipment sheet
  await writeSheetData(
    accessToken,
    spreadsheetId,
    WORKSHEET_NAMES.EQUIPMENT,
    WORKSHEET_HEADERS.EQUIPMENT,
    allRows.equipmentRows.map(equipmentRowToArray)
  );
}

// ============================================
// Main Handler
// ============================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405);
    }

    // Create user-scoped client (RLS enforced)
    const supabase = createUserSupabaseClient(req);

    // Validate user authentication
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    const { user } = auth;

    const body: ExportRequest = await req.json();
    const { organizationId, filters } = body;

    if (!organizationId) {
      return createErrorResponse("Missing required field: organizationId", 400);
    }

    // Verify user has admin/owner role in the organization
    const isAdmin = await verifyOrgAdmin(supabase, user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse("Forbidden: Only owners and admins can export reports", 403);
    }

    // Check rate limit
    const rateLimitOk = await checkRateLimit(supabase, user.id, organizationId);
    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait before requesting another export." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Google Workspace access token
    const adminClient = createAdminSupabaseClient();
    let tokenResult;
    try {
      tokenResult = await getGoogleWorkspaceAccessToken(adminClient, organizationId);
    } catch (tokenError) {
      if (tokenError instanceof GoogleWorkspaceTokenError) {
        logStep("Token error", { code: tokenError.code, message: tokenError.message });
        return new Response(
          JSON.stringify({
            error: tokenError.message,
            code: tokenError.code,
          }),
          { status: tokenError.code === "not_connected" ? 400 : 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw tokenError;
    }

    // Verify we have the spreadsheets scope
    if (!hasScope(tokenResult.scopes, GOOGLE_SCOPES.SPREADSHEETS)) {
      logStep("Missing spreadsheets scope", { scopes: tokenResult.scopes });
      return new Response(
        JSON.stringify({
          error: "Google Workspace is connected but does not have permission to create Sheets. Please reconnect Google Workspace in Organization Settings to grant the required permissions.",
          code: "insufficient_scopes",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log export request
    const { data: exportLog } = await supabase
      .from("export_request_log")
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        report_type: "work-orders-google-sheets",
        row_count: 0,
        status: "pending",
      })
      .select("id")
      .single();

    const exportLogId = exportLog?.id;

    try {
      // Fetch all work order data
      logStep("Fetching work order data", { organizationId });
      const data = await fetchWorkOrdersWithData(supabase, organizationId, filters);

      if (data.workOrders.length === 0) {
        if (exportLogId) {
          await supabase
            .from("export_request_log")
            .update({ status: "completed", row_count: 0, completed_at: new Date().toISOString() })
            .eq("id", exportLogId);
        }
        return new Response(
          JSON.stringify({ error: "No work orders found matching the filters" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build all worksheet data
      logStep("Building row data", { workOrderCount: data.workOrders.length });
      const allRows = buildAllRows(data);

      // Determine which sheets to create (skip PM Checklists if no data)
      const sheetNames = [
        WORKSHEET_NAMES.SUMMARY,
        WORKSHEET_NAMES.LABOR,
        WORKSHEET_NAMES.COSTS,
        ...(allRows.pmRows.length > 0 ? [WORKSHEET_NAMES.PM_CHECKLISTS] : []),
        WORKSHEET_NAMES.TIMELINE,
        WORKSHEET_NAMES.EQUIPMENT,
      ];

      // Create the spreadsheet
      const dateStr = new Date().toISOString().split("T")[0];
      const spreadsheetTitle = `Work Orders Export ${dateStr}`;
      
      logStep("Creating spreadsheet", { title: spreadsheetTitle, sheetCount: sheetNames.length });
      const { spreadsheetId, spreadsheetUrl } = await createSpreadsheet(
        tokenResult.accessToken,
        spreadsheetTitle,
        sheetNames
      );

      // Populate all sheets with data
      logStep("Populating spreadsheet", { spreadsheetId });
      await populateSpreadsheet(tokenResult.accessToken, spreadsheetId, allRows);

      // Apply formatting
      await formatSpreadsheet(tokenResult.accessToken, spreadsheetId, sheetNames.length);

      // Update export log
      if (exportLogId) {
        await supabase
          .from("export_request_log")
          .update({
            status: "completed",
            row_count: data.workOrders.length,
            completed_at: new Date().toISOString(),
          })
          .eq("id", exportLogId);
      }

      logStep("Export complete", { spreadsheetId, workOrderCount: data.workOrders.length });

      // Return the spreadsheet URL
      return new Response(
        JSON.stringify({
          spreadsheetId,
          spreadsheetUrl,
          workOrderCount: data.workOrders.length,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (exportError) {
      if (exportLogId) {
        await supabase
          .from("export_request_log")
          .update({ status: "failed", completed_at: new Date().toISOString() })
          .eq("id", exportLogId);
      }
      
      // Check if it's a scope error from Google API
      if (exportError instanceof GoogleWorkspaceTokenError) {
        return new Response(
          JSON.stringify({
            error: exportError.message,
            code: exportError.code,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw exportError;
    }
  } catch (error) {
    console.error("[EXPORT-TO-GOOGLE-SHEETS] Export error:", error);
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
