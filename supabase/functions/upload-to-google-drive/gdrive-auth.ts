import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  createAdminSupabaseClient,
  createErrorResponse,
  createJsonResponse,
  requireUser,
  verifyOrgAdmin,
} from "../_shared/supabase-clients.ts";
import {
  getGoogleWorkspaceAccessToken,
  GoogleWorkspaceTokenError,
  GOOGLE_SCOPES,
  hasScope,
} from "../_shared/google-workspace-token.ts";
import { checkRateLimit } from "../_shared/work-orders-export-data.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { logStep } from "./gdrive-validation.ts";
import { tokenErrorResponse, rateLimitResponse } from "./gdrive-error-responses.ts";

export interface AuthorizedDriveUpload {
  organizationId: string;
  destination: {
    parent_id: string;
    folder_by_team: boolean | null;
    folder_by_equipment: boolean | null;
  };
  accessToken: string;
  userId: string;
}

export async function authorizeDriveUpload(
  req: Request,
  supabase: SupabaseClient,
  organizationId: string | undefined,
  parentId: string | undefined,
): Promise<Response | AuthorizedDriveUpload> {
  const adminClient = createAdminSupabaseClient();

  const auth = await requireUser(req, supabase);
  if ("error" in auth) {
    return createErrorResponse(auth.error, auth.status);
  }

  const { user } = auth;

  if (!organizationId) {
    return createErrorResponse("Missing required field: organizationId", 400);
  }

  const isAdmin = await verifyOrgAdmin(supabase, user.id, organizationId);
  if (!isAdmin) {
    return createErrorResponse("Forbidden: Only owners and admins can upload to Drive", 403);
  }

  const { data: orgDestination, error: destinationError } = await supabase
    .from("organization_google_export_destinations")
    .select("parent_id, folder_by_team, folder_by_equipment")
    .eq("organization_id", organizationId)
    .eq("document_type", "work-orders-internal-packet")
    .maybeSingle();

  if (destinationError) {
    console.error("[UPLOAD-TO-GOOGLE-DRIVE] Failed to load organization folder:", destinationError);
    return createErrorResponse("An internal error occurred", 500);
  }

  const destinationParentId = orgDestination?.parent_id ?? parentId ?? null;
  if (!destinationParentId || !orgDestination?.parent_id) {
    return createJsonResponse(
      {
        error: "Organization Drive folder is not configured. Set an organization folder in Organization Settings before saving to Drive.",
        code: "missing_destination",
      },
      400,
      { req },
    );
  }

  let rateLimitOk: boolean;
  try {
    rateLimitOk = await checkRateLimit(supabase, user.id, organizationId);
  } catch (rateLimitError) {
    console.error("Rate limit check error:", rateLimitError);
    return createErrorResponse("An internal error occurred", 500);
  }

  if (!rateLimitOk) {
    return rateLimitResponse();
  }

  let tokenResult;
  try {
    tokenResult = await getGoogleWorkspaceAccessToken(adminClient, organizationId);
  } catch (tokenError) {
    if (tokenError instanceof GoogleWorkspaceTokenError) {
      logStep("Token error", { code: tokenError.code, message: tokenError.message });
      return tokenErrorResponse(tokenError);
    }
    throw tokenError;
  }

  if (!hasScope(tokenResult.scopes, GOOGLE_SCOPES.DRIVE_FILE)) {
    logStep("Missing drive.file scope", { scopes: tokenResult.scopes });
    return new Response(
      JSON.stringify({
        error: "Google Workspace is connected but does not have permission to upload files to Drive. Please reconnect Google Workspace in Organization Settings to grant the required permissions.",
        code: "insufficient_scopes",
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return {
    organizationId,
    destination: {
      parent_id: orgDestination.parent_id,
      folder_by_team: orgDestination.folder_by_team,
      folder_by_equipment: orgDestination.folder_by_equipment,
    },
    accessToken: tokenResult.accessToken,
    userId: user.id,
  };
}
