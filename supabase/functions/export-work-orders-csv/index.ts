/**
 * Export Work Orders CSV Edge Function
 *
 * Generates a CSV download for one or more work orders using the same data
 * model as the Excel internal packet export.
 */

import {
  createErrorResponse,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import {
  enforceExportAdminAndRateLimit,
  handleAuthenticatedExportPost,
  unexpectedExportErrorResponse,
} from "../_shared/export-request-gate.ts";
import { escapeCSVValue } from "../_shared/csv-export.ts";
import {
  fetchWorkOrdersWithData,
  buildAllRows,
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

Deno.serve(withCorrelationId((req, _ctx) => handleAuthenticatedExportPost(
  req,
  async ({ corsHeaders, supabase, user }) => {
    const body: ExportRequest = await req.json();
    const { organizationId, filters } = body;

    if (!organizationId) {
      return createErrorResponse("Missing required field: organizationId", 400, { req });
    }

    const gateResponse = await enforceExportAdminAndRateLimit({
      req,
      corsHeaders,
      supabase,
      userId: user.id,
      organizationId,
    });
    if (gateResponse) return gateResponse;

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
  },
  (error) => unexpectedExportErrorResponse(req, "[EXPORT-WORK-ORDERS-CSV] Export error:", error),
)));
