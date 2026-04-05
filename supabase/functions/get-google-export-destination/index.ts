import {
  createUserSupabaseClient,
  requireUser,
  verifyOrgAdmin,
  handleCorsPreflightIfNeeded,
  createErrorResponse,
} from "../_shared/supabase-clients.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface GetDestinationRequest {
  organizationId: string;
  documentType?: "work-orders-internal-packet";
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

    let body: GetDestinationRequest;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", 400);
    }

    const organizationId = body.organizationId;
    const documentType = body.documentType ?? "work-orders-internal-packet";

    if (!organizationId) {
      return createErrorResponse("Missing required field: organizationId", 400);
    }

    const isAdmin = await verifyOrgAdmin(supabase, auth.user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse("Forbidden: Only owners and admins can manage export destinations", 403);
    }

    const { data, error } = await supabase
      .from("organization_google_export_destinations")
      .select("id, organization_id, document_type, selection_kind, drive_id, parent_id, display_name, web_view_link, configured_by, folder_by_team, folder_by_equipment, created_at, updated_at")
      .eq("organization_id", organizationId)
      .eq("document_type", documentType)
      .maybeSingle();

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
