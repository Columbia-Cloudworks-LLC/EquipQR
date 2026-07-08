import {
  createAdminSupabaseClient,
  requireAuthenticatedPost,
  createErrorResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";
import {
  parseRequestJson,
  requireOrgAdminAccess,
  setGoogleExportDestinationRequestSchema,
  withOrgAdminScope,
} from "../_shared/org-scoped-queries.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getGoogleWorkspaceAccessToken, GoogleWorkspaceTokenError } from "../_shared/google-workspace-token.ts";
import { validateGoogleDriveDestination } from "../_shared/google-drive-picker-validation.ts";

const ADMIN_FORBIDDEN_MESSAGE =
  "Forbidden: Only owners and admins can manage export destinations";

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightIfNeeded(req, { useValidatedOrigin: true });
  if (corsResponse) return corsResponse;

  const corsOpts = { req };

  try {
    const authContext = await requireAuthenticatedPost(req);
    if (authContext instanceof Response) {
      return authContext;
    }
    const { supabase, user } = authContext;

    const parsedBody = await parseRequestJson(req, setGoogleExportDestinationRequestSchema);
    if (!parsedBody.success) {
      return createErrorResponse(parsedBody.error, parsedBody.status, corsOpts);
    }

    const {
      organizationId,
      documentType,
      selectionKind,
      parentId,
      folderByTeam,
      folderByEquipment,
    } = parsedBody.data;

    const adminAccess = await requireOrgAdminAccess(
      supabase,
      user.id,
      organizationId,
      ADMIN_FORBIDDEN_MESSAGE,
    );
    if ("error" in adminAccess) {
      return createErrorResponse(adminAccess.error, adminAccess.status, corsOpts);
    }

    const adminClient = createAdminSupabaseClient();
    let tokenResult;
    try {
      tokenResult = await getGoogleWorkspaceAccessToken(adminClient, organizationId);
    } catch (tokenError) {
      if (tokenError instanceof GoogleWorkspaceTokenError) {
        return new Response(
          JSON.stringify({ error: tokenError.message, code: tokenError.code }),
          { status: tokenError.code === "not_connected" ? 400 : 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
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
          { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
        );
      }

      const message = validationError instanceof Error ? validationError.message : "Unable to validate selected destination";
      return new Response(
        JSON.stringify({ error: message, code: "invalid_destination" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
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
      () =>
        supabase
          .from("organization_google_export_destinations")
          .upsert(upsertPayload, {
            onConflict: "organization_id,document_type",
          })
          .select("id, organization_id, document_type, selection_kind, drive_id, parent_id, display_name, web_view_link, configured_by, folder_by_team, folder_by_equipment, created_at, updated_at")
          .single(),
      ADMIN_FORBIDDEN_MESSAGE,
    );

    if (!upsertResult.ok) {
      return createErrorResponse(upsertResult.error, upsertResult.status, corsOpts);
    }

    const { data, error } = upsertResult.data;

    if (error) {
      console.error("[SET-GOOGLE-EXPORT-DESTINATION] Upsert error:", error);
      return createErrorResponse("An unexpected error occurred", 500, corsOpts);
    }

    return new Response(
      JSON.stringify({ destination: data }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[SET-GOOGLE-EXPORT-DESTINATION] Unexpected error:", error);
    return createErrorResponse("An unexpected error occurred", 500, corsOpts);
  }
});
