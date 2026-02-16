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
import { googleApiFetch } from "../_shared/google-api-retry.ts";
import { checkRateLimit } from "../_shared/work-orders-export-data.ts";

const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

// Maximum decoded file size: 15 MB
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 255;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
    delete safeDetails.contentBase64; // Don't log file content
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : "";
  console.log(`[UPLOAD-TO-GOOGLE-DRIVE] ${step}${detailsStr}`);
};

interface UploadRequest {
  organizationId: string;
  filename: string;
  contentBase64: string;
  mimeType?: string;
}

interface DriveFileResponse {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
}

/**
 * Sanitizes a filename to remove potentially dangerous characters.
 * Only allows alphanumeric, dots, hyphens, underscores, and spaces.
 * Blocks directory traversal patterns.
 */
function sanitizeFilename(filename: string): string {
  // Strip all characters except alphanumeric, dots, hyphens, underscores, and spaces
  let sanitized = filename.replace(/[^a-zA-Z0-9.\-_ ]/g, "_");
  
  // Block directory traversal patterns (.. sequences)
  sanitized = sanitized.replace(/\.{2,}/g, "_");
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Collapse multiple consecutive underscores/spaces
  sanitized = sanitized.replace(/[_ ]{2,}/g, "_");
  
  // Limit length while preserving extension
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const lastDot = sanitized.lastIndexOf(".");
    if (lastDot > 0) {
      const ext = sanitized.substring(lastDot);
      const name = sanitized.substring(0, MAX_FILENAME_LENGTH - ext.length - 1);
      sanitized = name + ext;
    } else {
      sanitized = sanitized.substring(0, MAX_FILENAME_LENGTH);
    }
  }
  
  // Ensure it has some content
  if (!sanitized || sanitized === "." || sanitized === "_") {
    sanitized = "uploaded-file";
  }
  
  return sanitized;
}

/**
 * Uploads a file to Google Drive using multipart upload.
 */
async function uploadToDrive(
  accessToken: string,
  filename: string,
  fileBytes: Uint8Array,
  mimeType: string
): Promise<DriveFileResponse> {
  // Build multipart body
  const boundary = "----EquipQRUploadBoundary" + Date.now();
  
  const metadata = {
    name: filename,
    mimeType,
  };
  
  // Create the multipart body
  const metadataPart = JSON.stringify(metadata);
  
  // Build the multipart message manually
  const encoder = new TextEncoder();
  const crlf = encoder.encode("\r\n");
  const boundaryLine = encoder.encode("--" + boundary);
  const endBoundaryLine = encoder.encode("--" + boundary + "--");
  
  const metadataHeader = encoder.encode(
    `\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`
  );
  const metadataContent = encoder.encode(metadataPart);
  
  const fileHeader = encoder.encode(
    `\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  
  // Calculate total size and create buffer
  const parts: Uint8Array[] = [
    boundaryLine,
    metadataHeader,
    metadataContent,
    crlf,
    boundaryLine,
    fileHeader,
    fileBytes,
    crlf,
    endBoundaryLine,
    crlf,
  ];
  
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    body.set(part, offset);
    offset += part.length;
  }
  
  const url = `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink`;
  
  const response = await googleApiFetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: body,
  }, { label: "drive-upload" });
  
  if (!response.ok) {
    const errorBody = await response.text();
    logStep("Failed to upload to Drive", { status: response.status, error: errorBody });
    
    if (response.status === 403) {
      // Check if it's a scope issue
      if (errorBody.includes("insufficientPermissions") || errorBody.includes("access")) {
        throw new GoogleWorkspaceTokenError(
          "Insufficient permissions. Please reconnect Google Workspace to grant Drive access.",
          "insufficient_scopes"
        );
      }
    }
    
    throw new Error(`Failed to upload file to Google Drive: ${response.status}`);
  }
  
  return await response.json();
}

// ============================================
// Main Handler
// ============================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;
  
  try {
    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405);
    }
    
    // Check content length header to reject oversized requests early.
    // The request body includes base64-encoded file data (~33% larger than decoded)
    // plus JSON overhead, so we allow up to 1.4x the max file size for the raw request.
    const contentLength = req.headers.get("Content-Length");
    if (contentLength && parseInt(contentLength, 10) >= MAX_FILE_SIZE_BYTES * 1.4) {
      return createErrorResponse("File too large. File must be less than 15 MB.", 413);
    }
    
    // Create user-scoped client (RLS enforced)
    const supabase = createUserSupabaseClient(req);
    
    // Validate user authentication
    const auth = await requireUser(req, supabase);
    if ("error" in auth) {
      return createErrorResponse(auth.error, auth.status);
    }
    
    const { user } = auth;
    
    let body: UploadRequest;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", 400);
    }
    
    const { organizationId, filename, contentBase64, mimeType = "application/pdf" } = body;
    
    // Validate mimeType against allowlist to prevent abuse
    const ALLOWED_MIME_TYPES = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    ];
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return createErrorResponse(
        `Unsupported format. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
        400
      );
    }
    
    // Validate organizationId first (before verifyOrgAdmin)
    if (!organizationId) {
      return createErrorResponse("Missing required field: organizationId", 400);
    }
    
    // Verify user has admin/owner role in the organization
    const isAdmin = await verifyOrgAdmin(supabase, user.id, organizationId);
    if (!isAdmin) {
      return createErrorResponse("Forbidden: Only owners and admins can upload to Drive", 403);
    }
    
    // Check rate limit to prevent excessive uploads
    let rateLimitOk: boolean;
    try {
      rateLimitOk = await checkRateLimit(supabase, user.id, organizationId);
    } catch (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      return createErrorResponse("An internal error occurred", 500);
    }
    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait before uploading another file." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate other required fields
    if (!filename) {
      return createErrorResponse("Missing required field: filename", 400);
    }
    if (!contentBase64) {
      return createErrorResponse("Missing required field: contentBase64", 400);
    }
    
    // Validate decoded file size from base64 string length.
    // Base64 encodes 3 bytes into 4 characters, so decoded size ≈ base64Length * 3/4.
    const estimatedDecodedSize = Math.ceil(contentBase64.length * 3 / 4);
    if (estimatedDecodedSize >= MAX_FILE_SIZE_BYTES) {
      return createErrorResponse("File too large. File must be less than 15 MB.", 413);
    }
    
    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(filename);
    logStep("Processing upload request", { 
      organizationId, 
      originalFilename: filename,
      sanitizedFilename,
      mimeType,
      contentLength: contentBase64.length,
    });
    
    // Get Google Workspace access token
    const adminClient = createAdminSupabaseClient();
    let tokenResult;
    try {
      tokenResult = await getGoogleWorkspaceAccessToken(adminClient, organizationId);
    } catch (tokenError) {
      if (tokenError instanceof GoogleWorkspaceTokenError) {
        logStep("Token error", { code: tokenError.code, message: tokenError.message });
        return new Response(
          JSON.stringify({
            error: tokenError.message,
            code: tokenError.code,
          }),
          { status: tokenError.code === "not_connected" ? 400 : 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw tokenError;
    }
    
    // Verify we have the drive.file scope
    if (!hasScope(tokenResult.scopes, GOOGLE_SCOPES.DRIVE_FILE)) {
      logStep("Missing drive.file scope", { scopes: tokenResult.scopes });
      return new Response(
        JSON.stringify({
          error: "Google Workspace is connected but does not have permission to upload files to Drive. Please reconnect Google Workspace in Organization Settings to grant the required permissions.",
          code: "insufficient_scopes",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Decode base64 content
    let fileBytes: Uint8Array;
    try {
      const binaryString = atob(contentBase64);
      fileBytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
    } catch {
      return createErrorResponse(
        "Invalid base64 content. The file data may be corrupted or incorrectly encoded.",
        400
      );
    }
    
    logStep("Uploading file to Drive", { filename: sanitizedFilename, size: fileBytes.length });
    
    // Upload to Drive
    let driveFile: DriveFileResponse;
    try {
      driveFile = await uploadToDrive(
        tokenResult.accessToken,
        sanitizedFilename,
        fileBytes,
        mimeType
      );
    } catch (uploadError) {
      if (uploadError instanceof GoogleWorkspaceTokenError) {
        return new Response(
          JSON.stringify({
            error: uploadError.message,
            code: uploadError.code,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw uploadError;
    }
    
    logStep("Upload complete", { fileId: driveFile.id, webViewLink: driveFile.webViewLink });
    
    // Return the file info
    return new Response(
      JSON.stringify({
        id: driveFile.id,
        name: driveFile.name,
        mimeType: driveFile.mimeType,
        webViewLink: driveFile.webViewLink,
        webContentLink: driveFile.webContentLink,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[UPLOAD-TO-GOOGLE-DRIVE] Upload error:", error);
    return createErrorResponse("An unexpected error occurred", 500);
  }
});
