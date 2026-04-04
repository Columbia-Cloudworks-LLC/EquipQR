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
  checkRateLimit,
  type ExportRequest,
} from "../_shared/work-orders-export-data.ts";
import { buildSingleWorkOrderGoogleDocData } from "../_shared/work-order-google-docs-single-data.ts";
import { createGoogleDocInFolder, batchUpdateGoogleDoc } from "../_shared/google-docs-api.ts";
import { buildExecutivePacketRequests } from "../_shared/work-order-google-docs-packet.ts";

const DOCUMENT_TYPE = "work-orders-internal-packet";

interface ExportToDocsResponse {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  workOrderCount: number;
  warnings?: string[];
}

function validateDocsExportRequest(body: ExportRequest): { code: string; error: string } | null {
  if (!body.filters?.workOrderId) {
    return {
      code: "single_work_order_required",
      error: "Google Docs export only supports a single work order. Use Google Sheets for bulk exports.",
    };
  }
  return null;
}

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405);
    }

    const supabase = createUserSupabaseClient(req);
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }

    let body: ExportRequest;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", 400);
    }

    const { organizationId, filters } = body;
    if (!organizationId) {
      return createErrorResponse("Missing required field: organizationId", 400);
    }
    if (!filters || typeof filters !== "object") {
      return createErrorResponse("Missing required field: filters", 400);
    }

    const validationError = validateDocsExportRequest(body);
    if (validationError) {
      return new Response(
        JSON.stringify(validationError),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isAdmin = await verifyOrgAdmin(supabase, auth.user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse("Forbidden: Only owners and admins can export reports", 403);
    }

    let rateLimitOk: boolean;
    try {
      rateLimitOk = await checkRateLimit(supabase, auth.user.id, organizationId);
    } catch (rateLimitError) {
      console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Rate limit check error:", rateLimitError);
      return createErrorResponse("An internal error occurred", 500);
    }
    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait before requesting another export." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: destination, error: destinationError } = await supabase
      .from("organization_google_export_destinations")
      .select("parent_id, display_name")
      .eq("organization_id", organizationId)
      .eq("document_type", DOCUMENT_TYPE)
      .maybeSingle();

    if (destinationError) {
      console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Failed to load destination:", destinationError);
      return createErrorResponse("An internal error occurred", 500);
    }

    if (!destination?.parent_id) {
      return new Response(
        JSON.stringify({
          error: "Google Docs destination is not configured. Set a destination in Organization Settings before exporting.",
          code: "missing_destination",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createAdminSupabaseClient();
    let tokenResult;
    try {
      tokenResult = await getGoogleWorkspaceAccessToken(adminClient, organizationId);
    } catch (tokenError) {
      if (tokenError instanceof GoogleWorkspaceTokenError) {
        return new Response(
          JSON.stringify({ error: tokenError.message, code: tokenError.code }),
          { status: tokenError.code === "not_connected" ? 400 : 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw tokenError;
    }

    if (!hasScope(tokenResult.scopes, GOOGLE_SCOPES.DRIVE_FILE)) {
      return new Response(
        JSON.stringify({
          error: "Google Workspace is connected but does not have permission to create Drive documents. Please reconnect Google Workspace in Organization Settings.",
          code: "insufficient_scopes",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: exportLog } = await supabase
      .from("export_request_log")
      .insert({
        user_id: auth.user.id,
        organization_id: organizationId,
        report_type: "work-orders-google-docs",
        row_count: 0,
        status: "pending",
      })
      .select("id")
      .single();
    const exportLogId = exportLog?.id;

    try {
      const packetData = await buildSingleWorkOrderGoogleDocData(
        supabase,
        organizationId,
        filters.workOrderId!,
      );

      const dateStr = new Date().toISOString().split("T")[0];
      const title = `${packetData.workOrder.title} — Internal Packet ${dateStr}`;

      const doc = await createGoogleDocInFolder(
        tokenResult.accessToken,
        title,
        destination.parent_id,
      );

      const packet = buildExecutivePacketRequests(packetData);

      if (packet.requests.length > 0) {
        await batchUpdateGoogleDoc(
          tokenResult.accessToken,
          doc.id,
          packet.requests,
        );
      }

      const webViewLink = doc.webViewLink
        ?? `https://docs.google.com/document/d/${doc.id}/edit`;

      if (exportLogId) {
        await supabase
          .from("export_request_log")
          .update({
            status: "completed",
            row_count: 1,
            file_url: webViewLink,
            completed_at: new Date().toISOString(),
          })
          .eq("id", exportLogId);
      }

      const response: ExportToDocsResponse = {
        id: doc.id,
        name: doc.name,
        mimeType: doc.mimeType,
        webViewLink,
        workOrderCount: 1,
        warnings: packet.warnings.length > 0 ? packet.warnings : undefined,
      };

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (exportError) {
      if (exportLogId) {
        await supabase
          .from("export_request_log")
          .update({
            status: "failed",
            error_message: exportError instanceof Error ? exportError.message : "Export failed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", exportLogId);
      }

      if (exportError instanceof GoogleWorkspaceTokenError) {
        return new Response(
          JSON.stringify({ error: exportError.message, code: exportError.code }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      throw exportError;
    }
  } catch (error) {
    console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Export error:", error);
    return createErrorResponse("An unexpected error occurred", 500);
  }
});

export const __testables = { validateDocsExportRequest };
