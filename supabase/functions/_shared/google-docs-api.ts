import { googleApiFetch } from "./google-api-retry.ts";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DOCS_API_BASE = "https://docs.googleapis.com/v1/documents";

export interface GoogleDocCreateResult {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

export type DriveDeleteResult =
  | { outcome: "deleted" }
  | { outcome: "not_found" }
  | { outcome: "permission_denied"; status: number }
  | { outcome: "error"; status: number; body: string };

export interface DriveFileMetadata {
  id: string;
  name?: string;
  mimeType?: string;
  trashed?: boolean;
  webViewLink?: string;
}

/**
 * Creates an empty Google Doc in the specified Drive folder.
 * Uses Drive API (not Docs API) to support Shared Drives.
 */
export async function createGoogleDocInFolder(
  accessToken: string,
  title: string,
  parentId: string,
): Promise<GoogleDocCreateResult> {
  const metadata = {
    name: title,
    mimeType: "application/vnd.google-apps.document",
    parents: [parentId],
  };

  const response = await googleApiFetch(
    `${DRIVE_FILES_URL}?supportsAllDrives=true&fields=id,name,mimeType,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    },
    { label: "drive-create-empty-doc" },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Failed to create Google Doc: ${response.status} ${errorBody}`);
  }

  return await response.json();
}

/**
 * Deletes a file from Google Drive by ID.
 * Returns a discriminated result so callers can handle each case without exceptions.
 */
export async function deleteGoogleDriveFile(
  accessToken: string,
  fileId: string,
): Promise<DriveDeleteResult> {
  const response = await googleApiFetch(
    `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    { label: "drive-delete-file" },
  );

  if (response.status === 204 || response.status === 200) {
    return { outcome: "deleted" };
  }
  if (response.status === 404) {
    return { outcome: "not_found" };
  }
  if (response.status === 403 || response.status === 401) {
    return { outcome: "permission_denied", status: response.status };
  }

  const body = await response.text().catch(() => "");
  return { outcome: "error", status: response.status, body };
}

/**
 * Fetches lightweight metadata for a Drive file.
 * Returns null if the file does not exist (404).
 */
export async function getGoogleDriveFileMetadata(
  accessToken: string,
  fileId: string,
): Promise<DriveFileMetadata | null> {
  const response = await googleApiFetch(
    `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id,name,mimeType,trashed,webViewLink`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    { label: "drive-get-metadata" },
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Failed to fetch Drive file metadata: ${response.status} ${errorBody}`);
  }

  return await response.json();
}

/**
 * Applies a batch of update requests to a Google Doc.
 * Returns the updated document resource.
 */
export async function batchUpdateGoogleDoc(
  accessToken: string,
  documentId: string,
  requests: Array<Record<string, unknown>>,
): Promise<void> {
  if (requests.length === 0) return;

  const response = await googleApiFetch(
    `${DOCS_API_BASE}/${documentId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    },
    { label: "docs-batch-update" },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`batchUpdate failed: ${response.status} ${errorBody}`);
  }
}

/**
 * Moves a Drive file into the configured organization folder.
 */
export async function moveGoogleDriveFileToParent(
  accessToken: string,
  fileId: string,
  parentId: string,
): Promise<void> {
  const metadataResponse = await googleApiFetch(
    `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=parents`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    { label: "drive-get-parents" },
  );

  if (!metadataResponse.ok) {
    const errorBody = await metadataResponse.text().catch(() => "");
    throw new Error(`Failed to read Drive file parents: ${metadataResponse.status} ${errorBody}`);
  }

  const metadata: { parents?: string[] } = await metadataResponse.json();
  const removeParents = (metadata.parents ?? []).join(",");

  const params = new URLSearchParams({
    addParents: parentId,
    supportsAllDrives: "true",
    fields: "id,parents",
  });
  if (removeParents) {
    params.set("removeParents", removeParents);
  }

  const moveResponse = await googleApiFetch(
    `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?${params.toString()}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
    { label: "drive-move-file" },
  );

  if (!moveResponse.ok) {
    const errorBody = await moveResponse.text().catch(() => "");
    throw new Error(`Failed to move Drive file into organization folder: ${moveResponse.status} ${errorBody}`);
  }
}

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Exports a Google Workspace file (Docs, Sheets, etc.) to a downloadable format.
 */
export async function exportGoogleDriveFile(
  accessToken: string,
  fileId: string,
  mimeType: string = DOCX_MIME,
): Promise<ArrayBuffer> {
  const params = new URLSearchParams({ mimeType });
  const response = await googleApiFetch(
    `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}/export?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    { label: "drive-export-file" },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Failed to export Drive file: ${response.status} ${errorBody}`);
  }

  return await response.arrayBuffer();
}

export { DOCX_MIME };
