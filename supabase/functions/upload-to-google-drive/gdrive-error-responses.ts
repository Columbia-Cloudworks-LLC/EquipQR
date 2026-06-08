import { corsHeaders } from "../_shared/cors.ts";
import { GoogleWorkspaceTokenError } from "../_shared/google-workspace-token.ts";
import type { DriveFileResponse } from "./gdrive-validation.ts";

export function tokenErrorResponse(error: GoogleWorkspaceTokenError): Response {
  return new Response(
    JSON.stringify({
      error: error.message,
      code: error.code,
    }),
    {
      status: error.code === "not_connected" ? 400 : 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

export function rateLimitResponse(): Response {
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded. Please wait before uploading another file." }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

export function driveUploadSuccessResponse(driveFile: DriveFileResponse): Response {
  return new Response(
    JSON.stringify({
      id: driveFile.id,
      name: driveFile.name,
      mimeType: driveFile.mimeType,
      webViewLink: driveFile.webViewLink,
      webContentLink: driveFile.webContentLink,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
