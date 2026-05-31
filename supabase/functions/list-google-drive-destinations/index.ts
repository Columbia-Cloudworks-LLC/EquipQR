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
import { browseGoogleDriveDestinations } from "../_shared/google-drive-destination-browser.ts";

interface ListDestinationsRequest {
  organizationId: string;
  parentId?: string | null;
  driveId?: string | null;
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

    let body: ListDestinationsRequest;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", 400);
    }

    const organizationId = body.organizationId;
    if (!organizationId) {
      return createErrorResponse("Missing required field: organizationId", 400);
    }

    const isAdmin = await verifyOrgAdmin(supabase, auth.user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse("Forbidden: Only owners and admins can browse Drive destinations", 403);
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

    if (!hasScope(tokenResult.scopes, GOOGLE_SCOPES.DRIVE_READONLY)) {
      return new Response(
        JSON.stringify({
          error: "Google Workspace is connected but does not have permission to browse Drive folders. Please reconnect Google Workspace in Organization Settings.",
          code: "insufficient_scopes",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const browseResult = await browseGoogleDriveDestinations(tokenResult.accessToken, {
      parentId: body.parentId ?? null,
      driveId: body.driveId ?? null,
    });

    return new Response(
      JSON.stringify({
        ...browseResult,
        workspaceDomain: tokenResult.domain,
        connectedEmail: null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[LIST-GOOGLE-DRIVE-DESTINATIONS] Unexpected error:", error);
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
