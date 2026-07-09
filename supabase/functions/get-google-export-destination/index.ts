import {
  requireAuthenticatedPost,
  handleCorsPreflightIfNeeded,
  createErrorResponse,
  createJsonResponse,
} from "../_shared/supabase-clients.ts";
import {
  applyOrganizationScope,
  getGoogleExportDestinationRequestSchema,
  parseRequestJson,
  requireOrgAdminAccess,
} from "../_shared/org-scoped-queries.ts";

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

    const parsedBody = await parseRequestJson(req, getGoogleExportDestinationRequestSchema);
    if (!parsedBody.success) {
      return createErrorResponse(parsedBody.error, parsedBody.status, corsOpts);
    }

    const { organizationId, documentType } = parsedBody.data;

    const adminAccess = await requireOrgAdminAccess(
      supabase,
      user.id,
      organizationId,
      ADMIN_FORBIDDEN_MESSAGE,
    );
    if ("error" in adminAccess) {
      return createErrorResponse(adminAccess.error, adminAccess.status, corsOpts);
    }

    const { data, error } = await applyOrganizationScope(
      supabase
        .from("organization_google_export_destinations")
        .select(
          "id, organization_id, document_type, selection_kind, drive_id, parent_id, display_name, web_view_link, configured_by, folder_by_team, folder_by_equipment, created_at, updated_at",
        ),
      organizationId,
    )
      .eq("document_type", documentType)
      .maybeSingle();

    if (error) {
      console.error("[GET-GOOGLE-EXPORT-DESTINATION] Query error:", error);
      return createErrorResponse("An unexpected error occurred", 500, corsOpts);
    }

    return createJsonResponse({ destination: data ?? null }, 200, corsOpts);
  } catch (error) {
    console.error("[GET-GOOGLE-EXPORT-DESTINATION] Unexpected error:", error);
    return createErrorResponse("An unexpected error occurred", 500, corsOpts);
  }
});
