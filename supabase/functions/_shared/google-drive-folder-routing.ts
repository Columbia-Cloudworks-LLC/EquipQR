/**
 * Readable subfolder resolution for Google Drive exports.
 *
 * Resolves (or creates) a nested folder path under a root destination
 * using human-readable names: e.g. "TeamName / EquipmentName".
 *
 * Uses `drive.file` scope and `supportsAllDrives=true` so it works with
 * both My Drive folders and Shared Drives.
 */

import { googleApiFetch } from "./google-api-retry.ts";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";

/**
 * Sanitizes a folder name for safe Drive usage while keeping it readable.
 * Strips control characters and leading/trailing whitespace.
 * Replaces runs of `/` and `\` with ` - ` to avoid path confusion.
 */
function sanitizeFolderName(raw: string): string {
  return raw
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/[/\\]+/g, " - ")
    .trim() || "Unnamed";
}

/**
 * Finds an existing non-trashed folder by exact name under a parent.
 * Returns its file ID, or null if none exists.
 */
async function findFolderByName(
  accessToken: string,
  parentId: string,
  name: string,
): Promise<string | null> {
  const escapedName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const q = `'${parentId}' in parents and mimeType='${FOLDER_MIME}' and name='${escapedName}' and trashed=false`;
  const url = `${DRIVE_FILES_URL}?supportsAllDrives=true&includeItemsFromAllDrives=true&q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`;

  const response = await googleApiFetch(
    url,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    { label: "drive-find-folder" },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to search for folder "${name}": ${response.status} ${body}`);
  }

  const data: { files?: Array<{ id: string; name: string }> } = await response.json();
  return data.files?.[0]?.id ?? null;
}

/**
 * Creates a folder with the given name under a parent.
 * Returns the new folder's file ID.
 */
async function createFolder(
  accessToken: string,
  parentId: string,
  name: string,
): Promise<string> {
  const metadata = {
    name,
    mimeType: FOLDER_MIME,
    parents: [parentId],
  };

  const response = await googleApiFetch(
    `${DRIVE_FILES_URL}?supportsAllDrives=true&fields=id`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    },
    { label: "drive-create-folder" },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to create folder "${name}": ${response.status} ${body}`);
  }

  const data: { id: string } = await response.json();
  return data.id;
}

/**
 * Resolves a single folder segment under a parent: finds an existing
 * folder by name, or creates one. Returns the folder's file ID.
 */
async function resolveSegment(
  accessToken: string,
  parentId: string,
  rawName: string,
): Promise<string> {
  const name = sanitizeFolderName(rawName);
  const existing = await findFolderByName(accessToken, parentId, name);
  if (existing) return existing;
  return createFolder(accessToken, parentId, name);
}

export interface FolderRoutingSegment {
  name: string | null;
}

/**
 * Resolves a full folder path under the root destination.
 *
 * Segments with null/empty names are skipped, so the path gracefully
 * collapses when team or equipment data is unavailable.
 *
 * @returns The Drive file ID of the deepest resolved folder.
 */
export async function resolveExportFolderPath(
  accessToken: string,
  rootParentId: string,
  segments: FolderRoutingSegment[],
): Promise<string> {
  let currentParentId = rootParentId;

  for (const segment of segments) {
    if (!segment.name?.trim()) continue;
    currentParentId = await resolveSegment(accessToken, currentParentId, segment.name);
  }

  return currentParentId;
}

export const __testables = { sanitizeFolderName, findFolderByName, createFolder };
