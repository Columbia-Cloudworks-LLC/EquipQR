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
import {
  createGoogleDocInFolder,
  batchUpdateGoogleDoc,
  deleteGoogleDriveFile,
} from "../_shared/google-docs-api.ts";
import { buildExecutivePacketRequests } from "../_shared/work-order-google-docs-packet.ts";
import { resolveExportFolderPath } from "../_shared/google-drive-folder-routing.ts";

const DOCUMENT_TYPE = "work-orders-internal-packet";
const RECORD_TYPE = "work_order";
const EXPORT_CHANNEL = "google_docs";
const ARTIFACT_KIND = "internal_packet";

interface ExportToDocsResponse {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  workOrderCount: number;
  replacedPrevious?: boolean;
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

function hasRequiredDocsExportScopes(scopes: string | null | undefined): boolean {
  return (
    hasScope(scopes, GOOGLE_SCOPES.DRIVE_FILE)
    && hasScope(scopes, GOOGLE_SCOPES.DOCUMENTS)
  );
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
      .select("parent_id, display_name, folder_by_team, folder_by_equipment")
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

    if (!hasRequiredDocsExportScopes(tokenResult.scopes)) {
      return new Response(
        JSON.stringify({
          error: "Google Workspace is connected but does not have permission to create and edit Google Docs. Please reconnect Google Workspace in Organization Settings.",
          code: "insufficient_scopes",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: exportLog, error: exportLogInsertError } = await adminClient
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
    if (exportLogInsertError) {
      console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Failed to create export log:", exportLogInsertError.message);
    }
    const exportLogId = exportLog?.id;
    let createdDocId: string | undefined;

    try {
      const workOrderId = filters.workOrderId!;
      const warnings: string[] = [];

      const packetData = await buildSingleWorkOrderGoogleDocData(
        supabase,
        organizationId,
        workOrderId,
      );

      // --- Resolve subfolder path: Team / Equipment (respects org toggles) ---
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
        const msg = folderError instanceof Error ? folderError.message : String(folderError);
        console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Subfolder resolution failed, using root:", msg);
        warnings.push("Could not create team/equipment subfolders; document saved to root destination.");
      }

      // --- Lookup previous artifact (needed for cleanup after successful creation) ---
      let replacedPrevious = false;
      const { data: prevArtifact, error: prevArtifactError } = await adminClient
        .from("record_export_artifacts")
        .select("id, provider_file_id")
        .eq("organization_id", organizationId)
        .eq("record_type", RECORD_TYPE)
        .eq("record_id", workOrderId)
        .eq("export_channel", EXPORT_CHANNEL)
        .eq("artifact_kind", ARTIFACT_KIND)
        .eq("status", "current")
        .maybeSingle();
      if (prevArtifactError) {
        console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Previous artifact lookup failed:", prevArtifactError.message);
        warnings.push("Could not check for a previous export; a new document will be created without replacing the old one.");
      }

      // --- Create new Google Doc first (safe: old doc stays intact on failure) ---
      const dateStr = new Date().toISOString().split("T")[0];
      const title = `${packetData.workOrder.title} — Internal Packet ${dateStr}`;

      const doc = await createGoogleDocInFolder(
        tokenResult.accessToken,
        title,
        targetParentId,
      );
      createdDocId = doc.id;

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

      // --- Upsert artifact record (points to new doc before old is removed) ---
      const { error: artifactUpsertError } = await adminClient
        .from("record_export_artifacts")
        .upsert({
          organization_id: organizationId,
          record_type: RECORD_TYPE,
          record_id: workOrderId,
          export_channel: EXPORT_CHANNEL,
          artifact_kind: ARTIFACT_KIND,
          provider: "google_drive",
          provider_file_id: doc.id,
          web_view_link: webViewLink,
          provider_parent_id: targetParentId,
          last_exported_at: new Date().toISOString(),
          last_exported_by: auth.user.id,
          status: "current",
        }, {
          onConflict: "organization_id,record_type,record_id,export_channel,artifact_kind",
        });
      if (artifactUpsertError) {
        console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Artifact upsert failed:", artifactUpsertError.message);
        warnings.push("Export succeeded but lineage tracking could not be saved. The 'Open Last Export' shortcut may not reflect this export.");
      }

      // --- Best-effort cleanup of previous Drive file ---
      if (prevArtifact?.provider_file_id) {
        const deleteResult = await deleteGoogleDriveFile(
          tokenResult.accessToken,
          prevArtifact.provider_file_id,
        );

        if (deleteResult.outcome === "deleted" || deleteResult.outcome === "not_found") {
          replacedPrevious = deleteResult.outcome === "deleted";
        } else {
          warnings.push("Previous export could not be deleted; a new document was created alongside it.");
        }
      }

      if (exportLogId) {
        const { error: logUpdateError } = await adminClient
          .from("export_request_log")
          .update({
            status: "completed",
            row_count: 1,
            completed_at: new Date().toISOString(),
          })
          .eq("id", exportLogId);
        if (logUpdateError) {
          console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Failed to update export log:", logUpdateError.message);
        }
      }

      const allWarnings = [...warnings, ...packet.warnings];

      const response: ExportToDocsResponse = {
        id: doc.id,
        name: doc.name,
        mimeType: doc.mimeType,
        webViewLink,
        workOrderCount: 1,
        replacedPrevious: replacedPrevious || undefined,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
      };

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (exportError) {
      const errMsg = exportError instanceof Error ? exportError.message : String(exportError);
      console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Inner export error:", errMsg);

      if (createdDocId && tokenResult?.accessToken) {
        try {
          await deleteGoogleDriveFile(tokenResult.accessToken, createdDocId);
          console.info("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Cleaned up orphaned doc:", createdDocId);
        } catch (cleanupErr) {
          console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Failed to clean up orphaned doc:", createdDocId, cleanupErr);
        }
      }

      if (exportLogId) {
        const { error: failLogError } = await adminClient
          .from("export_request_log")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", exportLogId);
        if (failLogError) {
          console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Failed to update export log on failure:", failLogError.message);
        }
      }

      if (exportError instanceof GoogleWorkspaceTokenError) {
        return new Response(
          JSON.stringify({ error: exportError.message, code: exportError.code }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          error: "An unexpected error occurred during export",
          detail: errMsg.substring(0, 200),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[EXPORT-WORK-ORDERS-TO-GOOGLE-DOCS] Outer error:", errMsg);
    return createErrorResponse("An unexpected error occurred", 500);
  }
});

export const __testables = { validateDocsExportRequest, hasRequiredDocsExportScopes };
