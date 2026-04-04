import {
  createUserSupabaseClient,
  createAdminSupabaseClient,
  requireUser,
  verifyOrgAdmin,
  createErrorResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getGoogleWorkspaceAccessToken, GoogleWorkspaceTokenError } from "../_shared/google-workspace-token.ts";
import { validateGoogleDriveDestination } from "../_shared/google-drive-picker-validation.ts";

interface SetDestinationRequest {
  organizationId: string;
  documentType?: "work-orders-internal-packet";
  selectionKind: "folder" | "shared_drive";
  parentId: string;
  folderByTeam?: boolean;
  folderByEquipment?: boolean;
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

    let body: SetDestinationRequest;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", 400);
    }

    const organizationId = body.organizationId;
    const documentType = body.documentType ?? "work-orders-internal-packet";
    const selectionKind = body.selectionKind;
    const parentId = body.parentId;

    if (!organizationId || !selectionKind || !parentId) {
      return createErrorResponse("Missing required fields for destination", 400);
    }

    if (!["folder", "shared_drive"].includes(selectionKind)) {
      return createErrorResponse("Invalid selectionKind value", 400);
    }

    const SUPPORTED_DOCUMENT_TYPES = ["work-orders-internal-packet"];
    if (!SUPPORTED_DOCUMENT_TYPES.includes(documentType)) {
      return createErrorResponse("Unsupported format", 400);
    }

    const isAdmin = await verifyOrgAdmin(supabase, auth.user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse("Forbidden: Only owners and admins can manage export destinations", 403);
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

    let destination;
    try {
      destination = await validateGoogleDriveDestination(tokenResult.accessToken, {
        parentId,
        selectionKind,
      });
    } catch (validationError) {
      if (validationError instanceof GoogleWorkspaceTokenError) {
        return new Response(
          JSON.stringify({ error: validationError.message, code: validationError.code }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const message = validationError instanceof Error ? validationError.message : "Unable to validate selected destination";
      return new Response(
        JSON.stringify({ error: message, code: "invalid_destination" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const upsertPayload: Record<string, unknown> = {
      organization_id: organizationId,
      document_type: documentType,
      selection_kind: selectionKind,
      drive_id: destination.driveId,
      parent_id: destination.parentId,
      display_name: destination.displayName,
      web_view_link: destination.webViewLink,
      configured_by: auth.user.id,
    };
    if (typeof body.folderByTeam === "boolean") {
      upsertPayload.folder_by_team = body.folderByTeam;
    }
    if (typeof body.folderByEquipment === "boolean") {
      upsertPayload.folder_by_equipment = body.folderByEquipment;
    }

    const { data, error } = await supabase
      .from("organization_google_export_destinations")
      .upsert(upsertPayload, {
        onConflict: "organization_id,document_type",
      })
      .select("id, organization_id, document_type, selection_kind, drive_id, parent_id, display_name, web_view_link, configured_by, folder_by_team, folder_by_equipment, created_at, updated_at")
      .single();

    if (error) {
      console.error("[SET-GOOGLE-EXPORT-DESTINATION] Upsert error:", error);
      return createErrorResponse("An unexpected error occurred", 500);
    }

    return new Response(
      JSON.stringify({ destination: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[SET-GOOGLE-EXPORT-DESTINATION] Unexpected error:", error);
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
