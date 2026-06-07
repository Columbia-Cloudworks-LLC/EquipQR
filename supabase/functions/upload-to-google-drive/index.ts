/**
 * Upload to Google Drive Edge Function
 *
 * Uploads a file (typically a PDF) to the user's Google Drive.
 * Used for saving work order PDFs to Google Drive for organizations
 * that have connected their Google Workspace.
 *
 * Accepts base64-encoded file content to keep the implementation simple.
 */

import {
  createUserSupabaseClient,
  createErrorResponse,
  handleCorsPreflightIfNeeded,
} from "../_shared/supabase-clients.ts";
import { GoogleWorkspaceTokenError } from "../_shared/google-workspace-token.ts";
import {
  ALLOWED_MIME_TYPES,
  logStep,
  MAX_FILE_SIZE_BYTES,
  sanitizeFilename,
  type UploadRequest,
} from "./gdrive-validation.ts";
import { decodeBase64Content, isDecodedSizeAllowed } from "./gdrive-decode.ts";
import { uploadToDrive } from "./gdrive-upload-api.ts";
import { authorizeDriveUpload } from "./gdrive-auth.ts";
import {
  driveUploadSuccessResponse,
  tokenErrorResponse,
} from "./gdrive-error-responses.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405);
    }

    const contentLength = req.headers.get("Content-Length");
    if (contentLength && parseInt(contentLength, 10) >= MAX_FILE_SIZE_BYTES * 1.4) {
      return createErrorResponse("File too large. File must be less than 15 MB.", 413);
    }

    const supabase = createUserSupabaseClient(req);

    let body: UploadRequest;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", 400);
    }

    const {
      organizationId,
      filename,
      contentBase64,
      mimeType = "application/pdf",
      parentId,
    } = body;

    if (!ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])) {
      return createErrorResponse(
        `Unsupported format. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
        400,
      );
    }

    const authResult = await authorizeDriveUpload(req, supabase, organizationId, parentId);
    if (authResult instanceof Response) {
      return authResult;
    }

    const { destinationParentId, accessToken } = authResult;

    if (!filename) {
      return createErrorResponse("Missing required field: filename", 400);
    }
    if (!contentBase64) {
      return createErrorResponse("Missing required field: contentBase64", 400);
    }

    if (!isDecodedSizeAllowed(contentBase64)) {
      return createErrorResponse("File too large. File must be less than 15 MB.", 413);
    }

    const sanitizedFilename = sanitizeFilename(filename);
    logStep("Processing upload request", {
      organizationId,
      originalFilename: filename,
      sanitizedFilename,
      mimeType,
      contentLength: contentBase64.length,
    });

    let fileBytes: Uint8Array;
    try {
      fileBytes = decodeBase64Content(contentBase64);
    } catch {
      return createErrorResponse(
        "Invalid base64 content. The file data may be corrupted or incorrectly encoded.",
        400,
      );
    }

    logStep("Uploading file to Drive", { filename: sanitizedFilename, size: fileBytes.length });

    let driveFile;
    try {
      driveFile = await uploadToDrive(
        accessToken,
        sanitizedFilename,
        fileBytes,
        mimeType,
        destinationParentId,
      );
    } catch (uploadError) {
      if (uploadError instanceof GoogleWorkspaceTokenError) {
        return tokenErrorResponse(uploadError);
      }
      throw uploadError;
    }

    logStep("Upload complete", { fileId: driveFile.id, webViewLink: driveFile.webViewLink });
    return driveUploadSuccessResponse(driveFile);
  } catch (error) {
    console.error("[UPLOAD-TO-GOOGLE-DRIVE] Upload error:", error);
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
