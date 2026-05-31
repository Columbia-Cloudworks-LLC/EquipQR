/**
 * Server-side Google Drive destination browser for organization file storage.
 * Uses the org Workspace token so admins browse the same tenant they connected.
 */

import { googleApiFetch } from "./google-api-retry.ts";
import { GoogleWorkspaceTokenError } from "./google-workspace-token.ts";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVES_URL = "https://www.googleapis.com/drive/v3/drives";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export type DriveDestinationBrowseKind = "shared_drive" | "folder";

export interface DriveDestinationBrowseItem {
  id: string;
  name: string;
  kind: DriveDestinationBrowseKind;
  driveId: string | null;
  selectable: boolean;
  parentId: string | null;
}

export interface DriveDestinationBrowseResult {
  items: DriveDestinationBrowseItem[];
  parentId: string | null;
  driveId: string | null;
}

interface DriveFileRecord {
  id: string;
  name?: string;
  mimeType?: string;
  driveId?: string;
  capabilities?: { canAddChildren?: boolean };
  trashed?: boolean;
}

interface SharedDriveRecord {
  id: string;
  name?: string;
}

export function mapSharedDriveToBrowseItem(drive: SharedDriveRecord): DriveDestinationBrowseItem {
  return {
    id: drive.id,
    name: drive.name?.trim() || "Shared Drive",
    kind: "shared_drive",
    driveId: drive.id,
    selectable: false,
    parentId: null,
  };
}

export function mapFolderToBrowseItem(
  file: DriveFileRecord,
  parentId: string | null,
  driveId: string | null,
): DriveDestinationBrowseItem | null {
  if (file.trashed) return null;
  if (file.mimeType !== FOLDER_MIME) return null;

  return {
    id: file.id,
    name: file.name?.trim() || "Folder",
    kind: "folder",
    driveId: driveId ?? file.driveId ?? null,
    selectable: Boolean(file.capabilities?.canAddChildren),
    parentId,
  };
}

async function listSharedDrives(accessToken: string): Promise<DriveDestinationBrowseItem[]> {
  const params = new URLSearchParams({
    pageSize: "100",
    fields: "drives(id,name)",
  });

  const response = await googleApiFetch(
    `${DRIVES_URL}?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    { label: "drive-list-shared-drives" },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) {
      throw new GoogleWorkspaceTokenError(
        "Google Workspace permissions do not allow listing Shared Drives. Please reconnect Google Workspace and try again.",
        "insufficient_scopes",
      );
    }
    throw new Error(`Unable to list Shared Drives: ${response.status} ${errorBody}`);
  }

  const data: { drives?: SharedDriveRecord[] } = await response.json();
  return (data.drives ?? []).map(mapSharedDriveToBrowseItem);
}

async function listChildFolders(
  accessToken: string,
  parentId: string,
  driveId: string | null,
): Promise<DriveDestinationBrowseItem[]> {
  const escapedParentId = parentId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const params = new URLSearchParams({
    q: `'${escapedParentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`,
    fields: "files(id,name,mimeType,driveId,capabilities(canAddChildren),trashed)",
    pageSize: "100",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    orderBy: "name_natural",
  });

  if (driveId) {
    params.set("corpora", "drive");
    params.set("driveId", driveId);
  } else {
    params.set("corpora", "user");
  }

  const response = await googleApiFetch(
    `${DRIVE_FILES_URL}?${params.toString()}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    { label: "drive-list-child-folders" },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) {
      throw new GoogleWorkspaceTokenError(
        "Google Workspace permissions do not allow browsing Drive folders. Please reconnect Google Workspace and try again.",
        "insufficient_scopes",
      );
    }
    throw new Error(`Unable to list Drive folders: ${response.status} ${errorBody}`);
  }

  const data: { files?: DriveFileRecord[] } = await response.json();
  return (data.files ?? [])
    .map((file) => mapFolderToBrowseItem(file, parentId, driveId))
    .filter((item): item is DriveDestinationBrowseItem => item !== null);
}

export async function browseGoogleDriveDestinations(
  accessToken: string,
  input: { parentId?: string | null; driveId?: string | null },
): Promise<DriveDestinationBrowseResult> {
  const parentId = input.parentId?.trim() || null;
  const driveId = input.driveId?.trim() || null;

  if (!parentId) {
    const [sharedDrives, myDriveFolders] = await Promise.all([
      listSharedDrives(accessToken),
      listChildFolders(accessToken, "root", null),
    ]);

    return {
      items: [...sharedDrives, ...myDriveFolders],
      parentId: null,
      driveId: null,
    };
  }

  const items = await listChildFolders(accessToken, parentId, driveId);

  return {
    items,
    parentId,
    driveId,
  };
}

export const __testables = {
  mapSharedDriveToBrowseItem,
  mapFolderToBrowseItem,
};
