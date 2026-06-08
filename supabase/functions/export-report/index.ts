/**
 * Export Report Edge Function
 *
 * Exports data (equipment, work orders, inventory, etc.) to CSV format.
 * Requires authenticated user with admin/owner role in the organization.
 * Uses user-scoped client so RLS policies apply.
 */

import {
  verifyOrgAdmin,
  createErrorResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
  requireAuthenticatedPost,
} from "../_shared/supabase-clients.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  checkRateLimit,
  type ExportFilters,
  type ReportType,
} from "./rate-limit.ts";
import { exportEquipment } from "./equipment-csv-export.ts";
import { exportWorkOrders } from "./work-orders-csv-export.ts";
import { exportInventory } from "./inventory-csv-export.ts";
import { exportScans } from "./scans-csv-export.ts";
import { exportAlternateGroups } from "./alternate-groups-csv-export.ts";

interface ExportRequest {
  reportType: ReportType;
  organizationId: string;
  filters: ExportFilters;
  columns: string[];
  format: "csv";
}

Deno.serve(withCorrelationId(async (req, _ctx) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    const authContext = await requireAuthenticatedPost(req);
    if (authContext instanceof Response) {
      return authContext;
    }

    const { supabase, user } = authContext;

    const body: ExportRequest = await req.json();
    const { reportType, organizationId, filters, columns, format } = body;

    if (!reportType || !organizationId || !columns || columns.length === 0) {
      return createErrorResponse(
        "Missing required fields: reportType, organizationId, and columns are required",
        400,
      );
    }

    if (format !== "csv") {
      return createErrorResponse("Unsupported format. Only CSV is currently supported.", 400);
    }

    const isAdmin = await verifyOrgAdmin(supabase, user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse("Forbidden: Only owners and admins can export reports", 403);
    }

    const rateLimitOk = await checkRateLimit(supabase, user.id, organizationId);
    if (!rateLimitOk) {
      return createErrorResponse(
        "Rate limit exceeded. Please wait before requesting another export.",
        429,
      );
    }

    const { data: exportLog } = await supabase
      .from("export_request_log")
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        report_type: reportType,
        row_count: 0,
        status: "pending",
      })
      .select("id")
      .single();

    const exportLogId = exportLog?.id;

    let csvContent: string;
    let rowCount: number;

    try {
      switch (reportType) {
        case "equipment":
          ({ csvContent, rowCount } = await exportEquipment(supabase, organizationId, filters, columns));
          break;
        case "work-orders":
          ({ csvContent, rowCount } = await exportWorkOrders(supabase, organizationId, filters, columns));
          break;
        case "inventory":
          ({ csvContent, rowCount } = await exportInventory(supabase, organizationId, filters, columns));
          break;
        case "scans":
          ({ csvContent, rowCount } = await exportScans(supabase, organizationId, filters, columns));
          break;
        case "alternate-groups":
          ({ csvContent, rowCount } = await exportAlternateGroups(supabase, organizationId, filters, columns));
          break;
        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      if (exportLogId) {
        await supabase
          .from("export_request_log")
          .update({
            status: "completed",
            row_count: rowCount,
            completed_at: new Date().toISOString(),
          })
          .eq("id", exportLogId);
      }

      return new Response(csvContent, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${reportType}_export_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } catch (exportError) {
      if (exportLogId) {
        await supabase
          .from("export_request_log")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", exportLogId);
      }
      throw exportError;
    }
  } catch (error) {
    console.error("[EXPORT-REPORT] Export error:", error);
    return createErrorResponse("An unexpected error occurred", 500);
  }
}));
