/**
 * Export Report Edge Function
 *
 * Exports data (equipment, work orders, inventory, etc.) to CSV format.
 * Org admins get the full console; team requestors/viewers get scoped work-order CSV only.
 * Uses user-scoped client so RLS policies apply.
 *
 * Async mode (#1193): for equipment / work-orders, pass `{ async: true }` to enqueue
 * a background job and receive `{ jobId, status }` instead of CSV bytes.
 */

import {
  createErrorResponse,
  createJsonResponse,
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
import { isAsyncExportReportType } from "../_shared/export-job.ts";
import {
  checkRateLimit,
} from "./rate-limit.ts";
import { exportEquipment } from "./equipment-csv-export.ts";
import { exportWorkOrders } from "./work-orders-csv-export.ts";
import { exportInventory } from "./inventory-csv-export.ts";
import { exportScans } from "./scans-csv-export.ts";
import { exportOperatorCheckins } from "./operator-checkins-csv-export.ts";
import { exportQuickForms } from "./quick-forms-csv-export.ts";
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

    const { reportType, organizationId, filters, columns, format, async: wantAsync } =
      parsedBody.data;

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

    if (wantAsync) {
      if (!isAsyncExportReportType(reportType)) {
        return createErrorResponse(
          "Async export is only supported for equipment and work-orders reports",
          400,
          { req },
        );
      }

      const payload = {
        filters: filters ?? {},
        columns,
        accessibleTeamIds: exportAccess.mode === "scoped" ? exportAccess.teamIds : null,
      };

      const { data: enqueueResult, error: enqueueError } = await supabase.rpc(
        "enqueue_export_job",
        {
          p_organization_id: organizationId,
          p_report_type: reportType,
          p_payload: payload,
        },
      );

      if (enqueueError) {
        console.error("[EXPORT-REPORT] enqueue failed", enqueueError);
        return createErrorResponse("Failed to enqueue export job", 500, { req });
      }

      const result = enqueueResult as {
        success?: boolean;
        code?: string;
        error?: string;
        jobId?: string;
        status?: string;
      } | null;

      if (!result?.success) {
        if (result?.code === "rate_limited") {
          return createErrorResponse(
            result.error ?? "Rate limit exceeded. Please wait before requesting another export.",
            429,
            { req },
          );
        }
        return createErrorResponse(result?.error ?? "Failed to enqueue export job", 400, { req });
      }

      return createJsonResponse(
        {
          async: true,
          jobId: result.jobId,
          status: result.status ?? "pending",
        },
        202,
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
        job_mode: "sync",
        delivery: "download",
        request_payload: { filters: filters ?? {}, columns },
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
        case "quick-forms":
          ({ csvContent, rowCount } = await exportQuickForms(supabase, organizationId, filters, columns));
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
