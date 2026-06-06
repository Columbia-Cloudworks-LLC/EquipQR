import { googleApiFetch } from "../_shared/google-api-retry.ts";
import {
  GoogleWorkspaceTokenError,
} from "../_shared/google-workspace-token.ts";
import { logStep, type DriveFileResponse } from "./gdrive-validation.ts";

const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

export async function uploadToDrive(
  accessToken: string,
  filename: string,
  fileBytes: Uint8Array,
  mimeType: string,
  parentId?: string,
): Promise<DriveFileResponse> {
  const boundary = "----EquipQRUploadBoundary" + Date.now();

  const metadata: { name: string; mimeType: string; parents?: string[] } = {
    name: filename,
    mimeType,
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const metadataPart = JSON.stringify(metadata);
  const encoder = new TextEncoder();
  const crlf = encoder.encode("\r\n");
  const boundaryLine = encoder.encode("--" + boundary);
  const endBoundaryLine = encoder.encode("--" + boundary + "--");

  const metadataHeader = encoder.encode(
    `\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
  );
  const metadataContent = encoder.encode(metadataPart);

  const fileHeader = encoder.encode(
    `\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );

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

  const url = `${DRIVE_UPLOAD_URL}?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,webViewLink,webContentLink`;

  const response = await googleApiFetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  }, { label: "drive-upload" });

  if (!response.ok) {
    const errorBody = await response.text();
    logStep("Failed to upload to Drive", { status: response.status, error: errorBody });

    if (response.status === 403) {
      if (errorBody.includes("insufficientPermissions") || errorBody.includes("access")) {
        throw new GoogleWorkspaceTokenError(
          "Insufficient permissions. Please reconnect Google Workspace to grant Drive access.",
          "insufficient_scopes",
        );
      }
    }

    throw new Error(`Failed to upload file to Google Drive: ${response.status}`);
  }

  return await response.json();
}
