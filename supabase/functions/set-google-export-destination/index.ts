import {
  createAdminSupabaseClient,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";
import {
  setGoogleExportDestinationRequestSchema,
  withOrgAdminScope,
} from "../_shared/org-scoped-queries.ts";
import { getGoogleWorkspaceAccessToken, GoogleWorkspaceTokenError } from "../_shared/google-workspace-token.ts";
import {
  authorizeExportDestinationAdminRequest,
  EXPORT_DESTINATION_ADMIN_FORBIDDEN_MESSAGE,
} from "../_shared/google-export-destination-request.ts";
import { validateGoogleDriveDestination } from "../_shared/google-drive-picker-validation.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightIfNeeded(req, { useValidatedOrigin: true });
  if (corsResponse) return corsResponse;

  const corsOpts = { req };

  try {
    const gate = await authorizeExportDestinationAdminRequest(
      req,
      setGoogleExportDestinationRequestSchema,
    );
    if (gate instanceof Response) return gate;
    const { supabase, user } = gate;
    const {
      organizationId,
      documentType,
      selectionKind,
      parentId,
      folderByTeam,
      folderByEquipment,
    } = gate.data;

    const adminClient = createAdminSupabaseClient();
    let tokenResult;
    try {
      tokenResult = await getGoogleWorkspaceAccessToken(adminClient, organizationId);
    } catch (tokenError) {
      if (tokenError instanceof GoogleWorkspaceTokenError) {
        return createJsonResponse(
          { error: tokenError.message, code: tokenError.code },
          tokenError.code === "not_connected" ? 400 : 403,
          corsOpts,
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
        return createJsonResponse(
          { error: validationError.message, code: validationError.code },
          403,
          corsOpts,
        );
      }

      const message = "Unable to validate selected destination";
      return createJsonResponse(
        { error: message, code: "invalid_destination" },
        400,
        corsOpts,
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
      configured_by: user.id,
    };
    if (typeof folderByTeam === "boolean") {
      upsertPayload.folder_by_team = folderByTeam;
    }
    if (typeof folderByEquipment === "boolean") {
      upsertPayload.folder_by_equipment = folderByEquipment;
    }

    const upsertResult = await withOrgAdminScope(
      supabase,
      user.id,
      organizationId,
      async () =>
        await supabase
          .from("organization_google_export_destinations")
          .upsert(upsertPayload, {
            onConflict: "organization_id,document_type",
          })
          .select("id, organization_id, document_type, selection_kind, drive_id, parent_id, display_name, web_view_link, configured_by, folder_by_team, folder_by_equipment, created_at, updated_at")
          .single(),
      EXPORT_DESTINATION_ADMIN_FORBIDDEN_MESSAGE,
    );

    if (!upsertResult.ok) {
      return createErrorResponse(upsertResult.error, upsertResult.status, corsOpts);
    }

    const { data, error } = upsertResult.data;

    if (error) {
      console.error("[SET-GOOGLE-EXPORT-DESTINATION] Upsert error:", error);
      return createErrorResponse("An unexpected error occurred", 500, corsOpts);
    }

    return createJsonResponse({ destination: data }, 200, corsOpts);
  } catch (error) {
    console.error("[SET-GOOGLE-EXPORT-DESTINATION] Unexpected error:", error);
    return createErrorResponse("An unexpected error occurred", 500, corsOpts);
  }
});
