import { GoogleWorkspaceTokenError } from "./google-workspace-token.ts";
import { googleApiFetch } from "./google-api-retry.ts";

const DRIVE_FILES_API_BASE = "https://www.googleapis.com/drive/v3/files";

export interface GoogleDriveDestinationValidationInput {
  parentId: string;
  selectionKind: "folder" | "shared_drive";
}

export interface GoogleDriveDestinationValidationResult {
  parentId: string;
  displayName: string;
  webViewLink: string | null;
  driveId: string | null;
}

interface DriveFileMetadata {
  id: string;
  name?: string;
  mimeType?: string;
  trashed?: boolean;
  driveId?: string;
  webViewLink?: string;
  capabilities?: {
    canAddChildren?: boolean;
  };
}

export async function validateGoogleDriveDestination(
  accessToken: string,
  input: GoogleDriveDestinationValidationInput,
): Promise<GoogleDriveDestinationValidationResult> {
  if (!input.parentId) {
    throw new GoogleWorkspaceTokenError(
      "Missing destination folder id.",
      "token_refresh_failed",
    );
  }

  const url = `${DRIVE_FILES_API_BASE}/${encodeURIComponent(input.parentId)}?supportsAllDrives=true&fields=id,name,mimeType,trashed,driveId,webViewLink,capabilities(canAddChildren)`;

  const response = await googleApiFetch(
    url,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    { label: "drive-destination-validate" },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error("[GOOGLE-DRIVE-DESTINATION] Failed to fetch destination", {
      status: response.status,
      errorBody,
      parentId: input.parentId,
    });

    if (response.status === 401 || response.status === 403) {
      throw new GoogleWorkspaceTokenError(
        "Google Workspace permissions do not allow validating the selected destination. Please reconnect Google Workspace and try again.",
        "insufficient_scopes",
      );
    }

    throw new Error("Unable to validate selected Google Drive destination.");
  }

  const metadata: DriveFileMetadata = await response.json();

  if (metadata.trashed) {
    throw new Error("The selected destination is in trash. Choose a different location.");
  }

  const isFolder = metadata.mimeType === "application/vnd.google-apps.folder";
  if (!isFolder) {
    throw new Error("Please select a Google Drive folder as the export destination.");
  }

  if (!metadata.capabilities?.canAddChildren) {
    throw new Error("You do not have permission to create files in the selected destination.");
  }

  if (input.selectionKind === "shared_drive" && !metadata.driveId) {
    throw new Error("Selected destination is not in a Shared Drive.");
  }

  return {
    parentId: metadata.id,
    displayName: metadata.name || "Google Drive Folder",
    webViewLink: metadata.webViewLink || null,
    driveId: metadata.driveId || null,
  };
}
