/**
 * Export Work Orders CSV Edge Function
 *
 * Generates a CSV download for one or more work orders using the same data
 * model as the Excel internal packet export.
 */

import {
  verifyOrgAdmin,
  createErrorResponse,
  handleCorsPreflightIfNeeded,
  requireAuthenticatedPost,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { escapeCSVValue } from "../_shared/csv-export.ts";
import {
  fetchWorkOrdersWithData,
  buildAllRows,
  checkRateLimit,
  createWorkOrderExportRateLimitResponse,
  summaryRowToArray,
  WORKSHEET_HEADERS,
  type ExportRequest,
} from "../_shared/work-orders-export-data.ts";

function generateSummaryCsv(allRows: ReturnType<typeof buildAllRows>): string {
  const headerLine = WORKSHEET_HEADERS.SUMMARY.map((header) => escapeCSVValue(header)).join(",");
  const dataLines = allRows.summaryRows.map((row) =>
    summaryRowToArray(row).map((value) => escapeCSVValue(value)).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

Deno.serve(withCorrelationId(async (req, _ctx) => {
  const corsHeaders = getCorsHeaders(req);
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    const authContext = await requireAuthenticatedPost(req);
    if (authContext instanceof Response) {
      return authContext;
    }

    const { supabase, user } = authContext;
    const body: ExportRequest = await req.json();
    const { organizationId, filters } = body;

    if (!organizationId) {
      return createErrorResponse("Missing required field: organizationId", 400, { req });
    }

    const isAdmin = await verifyOrgAdmin(supabase, user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse("Forbidden: Only owners and admins can export reports", 403, { req });
    }

    const rateLimitOk = await checkRateLimit(supabase, user.id, organizationId);
    if (!rateLimitOk) {
      return createWorkOrderExportRateLimitResponse(corsHeaders);
    }

    const data = await fetchWorkOrdersWithData(supabase, organizationId, filters);
    if (data.workOrders.length === 0) {
      return createErrorResponse("No work orders found matching the filters", 404, { req });
    }

    const csvContent = generateSummaryCsv(buildAllRows(data));
    const workOrderId = filters.workOrderId ?? data.workOrders[0]?.id ?? "export";
    const dateStr = new Date().toISOString().split("T")[0];
    const shortId = workOrderId.slice(0, 8);

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="work_order_${shortId}_${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error("[EXPORT-WORK-ORDERS-CSV] Export error:", error);
    return createErrorResponse("An unexpected error occurred", 500, { req });
  }
}));
