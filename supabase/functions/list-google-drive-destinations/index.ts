import {
  createUserSupabaseClient,
  createAdminSupabaseClient,
  requireUser,
  verifyOrgAdmin,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
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

const tokenErrorStatusMap: Record<string, number> = {
  not_connected: 400,
  oauth_not_configured: 500,
  encryption_config_error: 500,
  token_corruption: 500,
  token_refresh_failed: 502,
  token_revoked: 401,
  insufficient_scopes: 403,
};

Deno.serve(withCorrelationId(async (req, _ctx) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405, { req });
    }

    const supabase = createUserSupabaseClient(req);
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status, { req });
    }

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
    let tokenResult;
    try {
      tokenResult = await getGoogleWorkspaceAccessToken(adminClient, organizationId);
    } catch (tokenError) {
      if (tokenError instanceof GoogleWorkspaceTokenError) {
        const status = tokenErrorStatusMap[tokenError.code] ?? 500;
        return createJsonResponse(
          { error: tokenError.message, code: tokenError.code },
          status,
          { req },
        );
      }
      throw tokenError;
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
