/**
 * Export Report Edge Function
 *
 * Exports data (equipment, work orders, inventory, etc.) to CSV format.
 * Org admins get the full console; team requestors/viewers get scoped work-order CSV only.
 * Uses user-scoped client so RLS policies apply.
 */

import {
  createErrorResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
  requireAuthenticatedPost,
} from "../_shared/supabase-clients.ts";
import {
  exportReportRequestSchema,
  parseRequestJson,
} from "../_shared/org-scoped-queries.ts";
import { resolveWorkOrderExportAccess } from "../_shared/work-order-export-auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  checkRateLimit,
  type ExportFilters,
} from "./rate-limit.ts";
import { exportEquipment } from "./equipment-csv-export.ts";
import { exportWorkOrders } from "./work-orders-csv-export.ts";
import { exportInventory } from "./inventory-csv-export.ts";
import { exportScans } from "./scans-csv-export.ts";
import { exportOperatorCheckins } from "./operator-checkins-csv-export.ts";
import { exportAlternateGroups } from "./alternate-groups-csv-export.ts";

Deno.serve(withCorrelationId(async (req, _ctx) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    const authContext = await requireAuthenticatedPost(req);
    if (authContext instanceof Response) {
      return authContext;
    }

    const { supabase, user } = authContext;

    const parsedBody = await parseRequestJson(req, exportReportRequestSchema);
    if (!parsedBody.success) {
      return createErrorResponse(parsedBody.error, parsedBody.status, { req });
    }

    const { reportType, organizationId, filters, columns, format } = parsedBody.data;

    if (format !== "csv") {
      return createErrorResponse("Unsupported format. Only CSV is currently supported.", 400, { req });
    }

    const exportAccess = await resolveWorkOrderExportAccess(supabase, user.id, organizationId);
    if (!exportAccess) {
      return createErrorResponse("Forbidden: You do not have permission to export reports", 403, { req });
    }

    if (exportAccess.mode === "scoped" && reportType !== "work-orders") {
      return createErrorResponse(
        "Forbidden: Only work order summary exports are available for your role",
        403,
        { req },
      );
    }

    const rateLimitOk = await checkRateLimit(supabase, user.id, organizationId);
    if (!rateLimitOk) {
      return createErrorResponse(
        "Rate limit exceeded. Please wait before requesting another export.",
        429,
        { req },
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
          ({ csvContent, rowCount } = await exportWorkOrders(
            supabase,
            organizationId,
            filters,
            columns,
            exportAccess.mode === "scoped" ? exportAccess.teamIds : undefined,
          ));
          break;
        case "inventory":
          ({ csvContent, rowCount } = await exportInventory(supabase, organizationId, filters, columns));
          break;
        case "scans":
          ({ csvContent, rowCount } = await exportScans(supabase, organizationId, filters, columns));
          break;
        case "operator-check-ins":
          ({ csvContent, rowCount } = await exportOperatorCheckins(supabase, organizationId, filters, columns));
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
          ...getCorsHeaders(req),
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
    return createErrorResponse("An unexpected error occurred", 500, { req });
  }
}));
