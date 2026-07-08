import {
  requireAuthenticatedPost,
  handleCorsPreflightIfNeeded,
  createErrorResponse,
} from "../_shared/supabase-clients.ts";
import {
  applyOrganizationScope,
  getGoogleExportDestinationRequestSchema,
  parseJsonBody,
  withOrgAdminScope,
} from "../_shared/org-scoped-queries.ts";
import { corsHeaders } from "../_shared/cors.ts";

const ADMIN_FORBIDDEN_MESSAGE =
  "Forbidden: Only owners and admins can manage export destinations";

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    const authContext = await requireAuthenticatedPost(req);
    if (authContext instanceof Response) {
      return authContext;
    }
    const { supabase, user } = authContext;

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", 400);
    }

    const parsedBody = parseJsonBody(getGoogleExportDestinationRequestSchema, rawBody);
    if (!parsedBody.success) {
      return createErrorResponse(parsedBody.error, parsedBody.status);
    }

    const { organizationId, documentType } = parsedBody.data;

    const scopeResult = await withOrgAdminScope(
      supabase,
      user.id,
      organizationId,
      () =>
        applyOrganizationScope(
          supabase
            .from("organization_google_export_destinations")
            .select(
              "id, organization_id, document_type, selection_kind, drive_id, parent_id, display_name, web_view_link, configured_by, folder_by_team, folder_by_equipment, created_at, updated_at",
            ),
          organizationId,
        )
          .eq("document_type", documentType)
          .maybeSingle(),
      ADMIN_FORBIDDEN_MESSAGE,
    );

    if (!scopeResult.ok) {
      return createErrorResponse(scopeResult.error, scopeResult.status);
    }

    const { data, error } = scopeResult.data;
    if (error) {
      console.error("[GET-GOOGLE-EXPORT-DESTINATION] Query error:", error);
      return createErrorResponse("An unexpected error occurred", 500);
    }

    return new Response(
      JSON.stringify({ destination: data ?? null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[GET-GOOGLE-EXPORT-DESTINATION] Unexpected error:", error);
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
