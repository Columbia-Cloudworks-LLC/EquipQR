import { googleApiFetch } from "./google-api-retry.ts";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DOCS_API_BASE = "https://docs.googleapis.com/v1/documents";

export interface GoogleDocCreateResult {
  id: string;
  name: string;
  mimeType: string;
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
