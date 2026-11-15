import {
  handleCorsPreflightIfNeeded,
  createErrorResponse,
  createJsonResponse,
} from "../_shared/supabase-clients.ts";
import {
  applyOrganizationScope,
  getGoogleExportDestinationRequestSchema,
} from "../_shared/org-scoped-queries.ts";
import { authorizeExportDestinationAdminRequest } from "../_shared/google-export-destination-request.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightIfNeeded(req, { useValidatedOrigin: true });
  if (corsResponse) return corsResponse;

  const corsOpts = { req };

  try {
    const gate = await authorizeExportDestinationAdminRequest(
      req,
      getGoogleExportDestinationRequestSchema,
    );
    if (gate instanceof Response) return gate;
    const { supabase } = gate;
    const { organizationId, documentType } = gate.data;

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
