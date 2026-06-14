/**
 * Create, inspect, and delete Google Drive folders for destination browsing.
 */

import { googleApiFetch } from "./google-api-retry.ts";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export function sanitizeDriveFolderName(raw: string): string {
  return raw
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/[/\\]+/g, " - ")
    .trim() || "Unnamed";
}

export function resolveDriveCreateParentId(parentId: string, driveId: string | null): string {
  if (parentId === "root" && driveId) {
    return driveId;
  }

  return parentId;
}

export async function countDriveFolderChildren(
  accessToken: string,
  folderId: string,
): Promise<number> {
  const escapedFolderId = folderId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  let total = 0;
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${escapedFolderId}' in parents and trashed=false`,
      fields: "nextPageToken,files(id)",
      pageSize: "100",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await googleApiFetch(
      `${DRIVE_FILES_URL}?${params.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      { label: "drive-count-folder-children" },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Failed to inspect folder contents: ${response.status} ${body}`);
    }

    const data: { files?: Array<{ id: string }>; nextPageToken?: string } = await response.json();
    total += data.files?.length ?? 0;
    pageToken = data.nextPageToken;
  } while (pageToken);

  return total;
}

export async function createDriveFolder(
  accessToken: string,
  parentId: string,
  rawName: string,
): Promise<{ id: string; name: string }> {
  const name = sanitizeDriveFolderName(rawName);

  const response = await googleApiFetch(
    `${DRIVE_FILES_URL}?supportsAllDrives=true&fields=id,name`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        mimeType: FOLDER_MIME,
        parents: [parentId],
      }),
    },
    { label: "drive-create-destination-folder" },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to create folder "${name}": ${response.status} ${body}`);
  }

  const data: { id: string; name?: string } = await response.json();
  return { id: data.id, name: data.name?.trim() || name };
}

export async function deleteDriveFolder(
  accessToken: string,
  folderId: string,
): Promise<void> {
  const response = await googleApiFetch(
    `${DRIVE_FILES_URL}/${encodeURIComponent(folderId)}?supportsAllDrives=true`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    { label: "drive-delete-folder" },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to delete folder: ${response.status} ${body}`);
  }
}
