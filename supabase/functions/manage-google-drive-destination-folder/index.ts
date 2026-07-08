import {
  createUserSupabaseClient,
  createAdminSupabaseClient,
  requireUser,
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import {
  manageGoogleDriveFolderRequestSchema,
  parseJsonBody,
  requireOrgAdminAccess,
} from "../_shared/org-scoped-queries.ts";
import {
  getGoogleWorkspaceAccessToken,
  GoogleWorkspaceTokenError,
  GOOGLE_SCOPES,
  hasScope,
} from "../_shared/google-workspace-token.ts";
import {
  countDriveFolderChildren,
  createDriveFolder,
  deleteDriveFolder,
  resolveDriveCreateParentId,
  sanitizeDriveFolderName,
} from "../_shared/google-drive-folder-management.ts";

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

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", 400, { req });
    }

    const parsedBody = parseJsonBody(manageGoogleDriveFolderRequestSchema, rawBody);
    if (!parsedBody.success) {
      return createErrorResponse(parsedBody.error, parsedBody.status, { req });
    }

    const { organizationId, action } = parsedBody.data;
    const body = parsedBody.data;

    const adminAccess = await requireOrgAdminAccess(
      supabase,
      auth.user.id,
      organizationId,
      "Forbidden: Only owners and admins can manage Google Drive folders",
    );
    if ("error" in adminAccess) {
      return createErrorResponse(adminAccess.error, adminAccess.status, { req });
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

    if (!hasScope(tokenResult.scopes, GOOGLE_SCOPES.DRIVE_FILE)) {
      return createJsonResponse(
        {
          error:
            "Google Workspace is connected but does not have permission to create or delete Drive folders. Please reconnect Google Workspace in Organization Settings.",
          code: "insufficient_scopes",
        },
        403,
        { req },
      );
    }

    if (action === "create") {
      const parentId = body.parentId?.trim();
      const rawName = body.name?.trim();

      if (!parentId || !rawName) {
        return createErrorResponse("Missing required fields for create: parentId, name", 400, { req });
      }

      const createParentId = resolveDriveCreateParentId(parentId, body.driveId?.trim() || null);
      const folder = await createDriveFolder(tokenResult.accessToken, createParentId, rawName);

      return createJsonResponse(
        {
          folder: {
            id: folder.id,
            name: folder.name,
            kind: "folder",
            driveId: body.driveId?.trim() || null,
            selectable: true,
            parentId: createParentId,
          },
          sanitizedName: sanitizeDriveFolderName(rawName),
        },
        200,
        { req },
      );
    }

    const folderId = body.folderId?.trim();
    if (!folderId) {
      return createErrorResponse("Missing required field for delete: folderId", 400, { req });
    }

    const childCount = await countDriveFolderChildren(tokenResult.accessToken, folderId);
    const hasContents = childCount > 0;

    if (hasContents && body.confirmDataLoss !== true) {
      return createJsonResponse(
        {
          error:
            "This folder contains files or subfolders. Confirm permanent deletion before proceeding.",
          code: "folder_not_empty_requires_confirmation",
          childCount,
          hasContents: true,
        },
        409,
        { req },
      );
    }

    await deleteDriveFolder(tokenResult.accessToken, folderId);

    return createJsonResponse(
      {
        deleted: true,
        folderId,
        hadContents: hasContents,
        childCount,
      },
      200,
      { req },
    );
  } catch (error) {
    console.error("[MANAGE-GOOGLE-DRIVE-DESTINATION-FOLDER] Unexpected error:", error);
    return createErrorResponse("An unexpected error occurred", 500, { req });
  }
}));
