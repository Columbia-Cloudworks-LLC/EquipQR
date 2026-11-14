import {
  createAdminSupabaseClient,
  verifyOrgAdmin,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import {
  GoogleWorkspaceTokenError,
  GOOGLE_SCOPES,
  hasScope,
} from "../_shared/google-workspace-token.ts";
import {
  getGoogleAccessTokenOrError,
  googleTokenErrorJsonResponse,
} from "../_shared/google-workspace-token-response.ts";
import { requireUserPost } from "../_shared/user-post-request.ts";
import { browseGoogleDriveDestinations } from "../_shared/google-drive-destination-browser.ts";

interface ListDestinationsRequest {
  organizationId: string;
  parentId?: string | null;
  driveId?: string | null;
}

Deno.serve(withCorrelationId(async (req, _ctx) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await requireUserPost(req);
    if (auth instanceof Response) return auth;
    const { supabase } = auth;

    let body: ListDestinationsRequest;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", 400, { req });
    }

    const organizationId = body.organizationId;
    if (!organizationId) {
      return createErrorResponse("Missing required field: organizationId", 400, { req });
    }

    const isAdmin = await verifyOrgAdmin(supabase, auth.user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse("Forbidden: Only owners and admins can browse Drive destinations", 403, { req });
    }

    const adminClient = createAdminSupabaseClient();
    const tokenResult = await getGoogleAccessTokenOrError(adminClient, organizationId);
    if (tokenResult instanceof GoogleWorkspaceTokenError) {
      return googleTokenErrorJsonResponse(tokenResult, req);
    }

    if (!hasScope(tokenResult.scopes, GOOGLE_SCOPES.DRIVE_READONLY)) {
      return createJsonResponse(
        {
          error: "Google Workspace is connected but does not have permission to browse Drive folders. Please reconnect Google Workspace in Organization Settings.",
          code: "insufficient_scopes",
        },
        403,
        { req },
      );
    }

    const browseResult = await browseGoogleDriveDestinations(tokenResult.accessToken, {
      parentId: body.parentId ?? null,
      driveId: body.driveId ?? null,
    });

    return createJsonResponse(
      {
        ...browseResult,
        workspaceDomain: tokenResult.domain,
        connectedEmail: null,
      },
      200,
      { req },
    );
  } catch (error) {
    console.error("[LIST-GOOGLE-DRIVE-DESTINATIONS] Unexpected error:", error);
    return createErrorResponse("An unexpected error occurred", 500, { req });
  }
}));
