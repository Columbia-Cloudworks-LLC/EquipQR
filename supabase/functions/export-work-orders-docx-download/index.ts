/**
 * Export Work Orders DOCX Download Edge Function
 *
 * Builds the internal packet in a temporary Google Doc, exports it as DOCX,
 * deletes the temporary file, and returns the binary download.
 */

import {
  createAdminSupabaseClient,
  requireAuthenticatedPost,
  verifyOrgAdmin,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  getGoogleWorkspaceAccessToken,
  GoogleWorkspaceTokenError,
  GOOGLE_SCOPES,
  hasScope,
} from "../_shared/google-workspace-token.ts";
import {
  checkRateLimit,
  createWorkOrderExportRateLimitResponse,
  type ExportRequest,
} from "../_shared/work-orders-export-data.ts";
import { buildSingleWorkOrderGoogleDocData } from "../_shared/work-order-google-docs-single-data.ts";
import {
  batchUpdateGoogleDoc,
  createGoogleDocInFolder,
  deleteGoogleDriveFile,
  exportGoogleDriveFile,
  DOCX_MIME,
} from "../_shared/google-docs-api.ts";
import { buildExecutivePacketRequests } from "../_shared/work-order-google-docs-packet.ts";
import { resolveExportFolderPath } from "../_shared/google-drive-folder-routing.ts";

const DOCUMENT_TYPE = "work-orders-internal-packet";

function validateDocxExportRequest(body: ExportRequest): { code: string; error: string } | null {
  if (!body.filters?.workOrderId) {
    return {
      code: "single_work_order_required",
      error: "DOCX download only supports a single work order.",
    };
  }
  return null;
}

function hasRequiredDocsExportScopes(scopes: string | null | undefined): boolean {
  return (
    hasScope(scopes, GOOGLE_SCOPES.DRIVE_FILE)
    && hasScope(scopes, GOOGLE_SCOPES.DOCUMENTS)
  );
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
      return createErrorResponse("Missing required field: organizationId", 400);
    }

    const validationError = validateDocxExportRequest(body);
    if (validationError) {
      return createJsonResponse(validationError, 400, { req });
    }

    const isAdmin = await verifyOrgAdmin(supabase, user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse("Forbidden: Only owners and admins can export reports", 403);
    }

    const rateLimitOk = await checkRateLimit(supabase, user.id, organizationId);
    if (!rateLimitOk) {
      return createWorkOrderExportRateLimitResponse(corsHeaders);
    }

    const { data: destination, error: destinationError } = await supabase
      .from("organization_google_export_destinations")
      .select("parent_id, folder_by_team, folder_by_equipment")
      .eq("organization_id", organizationId)
      .eq("document_type", DOCUMENT_TYPE)
      .maybeSingle();

    if (destinationError) {
      console.error("[EXPORT-WORK-ORDERS-DOCX] Failed to load destination:", destinationError);
      return createErrorResponse("An internal error occurred", 500);
    }

    if (!destination?.parent_id) {
      return new Response(
        JSON.stringify({
          error: "Organization Drive folder is not configured. Set an organization folder in Organization Settings before exporting.",
          code: "missing_destination",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createAdminSupabaseClient();
    const tokenResult = await getGoogleWorkspaceAccessToken(adminClient, organizationId);

    if (!hasRequiredDocsExportScopes(tokenResult.scopes)) {
      return new Response(
        JSON.stringify({
          error: "Google Workspace is connected but does not have permission to create and edit Google Docs.",
          code: "insufficient_scopes",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const workOrderId = filters!.workOrderId!;

    const packetData = await buildSingleWorkOrderGoogleDocData(
      supabase,
      organizationId,
      workOrderId,
    );

    const folderByTeam = destination.folder_by_team !== false;
    const folderByEquipment = destination.folder_by_equipment !== false;

    let targetParentId = destination.parent_id;
    try {
      targetParentId = await resolveExportFolderPath(
        tokenResult.accessToken,
        destination.parent_id,
        [
          { name: folderByTeam ? packetData.team.name : null },
          { name: folderByEquipment ? packetData.equipment.name : null },
        ],
      );
    } catch (folderError) {
      console.error("[EXPORT-WORK-ORDERS-DOCX] Subfolder resolution failed, using root:", folderError);
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const title = `${packetData.workOrder.title} — Internal Packet ${dateStr} (download)`;
    const doc = await createGoogleDocInFolder(tokenResult.accessToken, title, targetParentId);
    try {
      const packet = buildExecutivePacketRequests(packetData);

      if (packet.requests.length > 0) {
        await batchUpdateGoogleDoc(tokenResult.accessToken, doc.id, packet.requests);
      }

      const docxBuffer = await exportGoogleDriveFile(tokenResult.accessToken, doc.id, DOCX_MIME);
      const shortId = workOrderId.slice(0, 8);
      return new Response(docxBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": DOCX_MIME,
          "Content-Disposition": `attachment; filename="work_order_${shortId}_internal_packet_${dateStr}.docx"`,
        },
      });
    } finally {
      try {
        const deleteResult = await deleteGoogleDriveFile(tokenResult.accessToken, doc.id);
        if (deleteResult.outcome !== "deleted" && deleteResult.outcome !== "not_found") {
          console.error(
            "[EXPORT-WORK-ORDERS-DOCX] Temp doc cleanup failed:",
            doc.id,
            deleteResult,
          );
        }
      } catch (cleanupError) {
        console.error("[EXPORT-WORK-ORDERS-DOCX] Temp doc cleanup threw:", doc.id, cleanupError);
      }
    }
  } catch (error) {
    if (error instanceof GoogleWorkspaceTokenError) {
      return new Response(
        JSON.stringify({ error: error.message, code: error.code }),
        { status: error.code === "not_connected" ? 400 : 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.error("[EXPORT-WORK-ORDERS-DOCX] Export error:", error);
    return createErrorResponse("An unexpected error occurred", 500);
  }
}));

export const __testables = { validateDocxExportRequest, hasRequiredDocsExportScopes };
