/**
 * Export Work Orders DOCX Download Edge Function
 *
 * Builds the internal packet in a temporary Google Doc, exports it as DOCX,
 * deletes the temporary file, and returns the binary download.
 */

import {
  createAdminSupabaseClient,
  createErrorResponse,
  createJsonResponse,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import {
  getGoogleWorkspaceAccessToken,
  GoogleWorkspaceTokenError,
} from "../_shared/google-workspace-token.ts";
import {
  enforceExportAdminAndRateLimit,
  handleAuthenticatedExportPost,
} from "../_shared/export-request-gate.ts";
import {
  createInternalPacketDoc,
  hasRequiredDocsExportScopes,
  resolveTeamEquipmentFolder,
} from "../_shared/google-docs-export-support.ts";
import type { ExportRequest } from "../_shared/work-orders-export-data.ts";
import { buildSingleWorkOrderGoogleDocData } from "../_shared/work-order-google-docs-single-data.ts";
import {
  batchUpdateGoogleDoc,
  deleteGoogleDriveFile,
  exportGoogleDriveFile,
  DOCX_MIME,
} from "../_shared/google-docs-api.ts";
import { buildExecutivePacketRequests } from "../_shared/work-order-google-docs-packet.ts";

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

Deno.serve(withCorrelationId((req, _ctx) => handleAuthenticatedExportPost(
  req,
  async ({ corsHeaders, supabase, user }) => {
    const body: ExportRequest = await req.json();
    const { organizationId, filters } = body;

    if (!organizationId) {
      return createErrorResponse("Missing required field: organizationId", 400, { req });
    }

    const validationError = validateDocxExportRequest(body);
    if (validationError) {
      return createJsonResponse(validationError, 400, { req });
    }

    const gateResponse = await enforceExportAdminAndRateLimit({
      req,
      corsHeaders,
      supabase,
      userId: user.id,
      organizationId,
    });
    if (gateResponse) return gateResponse;

    const { data: destination, error: destinationError } = await supabase
      .from("organization_google_export_destinations")
      .select("parent_id, folder_by_team, folder_by_equipment")
      .eq("organization_id", organizationId)
      .eq("document_type", DOCUMENT_TYPE)
      .maybeSingle();

    if (destinationError) {
      console.error("[EXPORT-WORK-ORDERS-DOCX] Failed to load destination:", destinationError);
      return createErrorResponse("An internal error occurred", 500, { req });
    }

    if (!destination?.parent_id) {
      return createJsonResponse(
        {
          error: "Organization Drive folder is not configured. Set an organization folder in Organization Settings before exporting.",
          code: "missing_destination",
        },
        400,
        { req },
      );
    }

    const adminClient = createAdminSupabaseClient();
    const tokenResult = await getGoogleWorkspaceAccessToken(adminClient, organizationId);

    if (!hasRequiredDocsExportScopes(tokenResult.scopes)) {
      return createJsonResponse(
        {
          error: "Google Workspace is connected but does not have permission to create and edit Google Docs.",
          code: "insufficient_scopes",
        },
        403,
        { req },
      );
    }

    const workOrderId = filters!.workOrderId!;

    const packetData = await buildSingleWorkOrderGoogleDocData(
      supabase,
      organizationId,
      workOrderId,
    );

    let targetParentId = destination.parent_id;
    try {
      targetParentId = await resolveTeamEquipmentFolder(
        tokenResult.accessToken,
        destination,
        packetData,
      );
    } catch (folderError) {
      console.error("[EXPORT-WORK-ORDERS-DOCX] Subfolder resolution failed, using root:", folderError);
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const doc = await createInternalPacketDoc(
      tokenResult.accessToken,
      packetData,
      targetParentId,
      dateStr,
      " (download)",
    );
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
  },
  (error) => {
    if (error instanceof GoogleWorkspaceTokenError) {
      return createJsonResponse(
        { error: error.message, code: error.code },
        error.code === "not_connected" ? 400 : 403,
        { req },
      );
    }

    console.error("[EXPORT-WORK-ORDERS-DOCX] Export error:", error);
    return createErrorResponse("An unexpected error occurred", 500, { req });
  },
)));

export const __testables = { validateDocxExportRequest, hasRequiredDocsExportScopes };
