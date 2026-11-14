/**
 * Shared pieces of the single work order Google Docs packet exports
 * (Google Docs export, DOCX download, PDF upload to Drive).
 */

import { createGoogleDocInFolder } from "./google-docs-api.ts";
import { resolveExportFolderPath } from "./google-drive-folder-routing.ts";
import { GOOGLE_SCOPES, hasScope } from "./google-workspace-token.ts";
import type { SingleWorkOrderGoogleDocData } from "./work-order-google-docs-single-data.ts";

/** Org Drive destination row fields that control Team / Equipment subfolders. */
export interface ExportDestinationFolders {
  parent_id: string;
  folder_by_team?: boolean | null;
  folder_by_equipment?: boolean | null;
}

/** Google Docs exports need both Drive file and Docs scopes. */
export function hasRequiredDocsExportScopes(scopes: string | null | undefined): boolean {
  return (
    hasScope(scopes, GOOGLE_SCOPES.DRIVE_FILE)
    && hasScope(scopes, GOOGLE_SCOPES.DOCUMENTS)
  );
}

/**
 * Resolve (creating as needed) the Team / Equipment subfolder under the org destination,
 * honouring the org's folder toggles. Throws when Drive routing fails; callers decide
 * whether to fall back to `destination.parent_id`.
 */
export function resolveTeamEquipmentFolder(
  accessToken: string,
  destination: ExportDestinationFolders,
  packetData: Pick<SingleWorkOrderGoogleDocData, "team" | "equipment">,
): Promise<string> {
  const folderByTeam = destination.folder_by_team !== false;
  const folderByEquipment = destination.folder_by_equipment !== false;

  return resolveExportFolderPath(
    accessToken,
    destination.parent_id,
    [
      { name: folderByTeam ? packetData.team.name : null },
      { name: folderByEquipment ? packetData.equipment.name : null },
    ],
  );
}

/** Create the empty internal packet Google Doc: "<work order title> — Internal Packet <date><suffix>". */
export function createInternalPacketDoc(
  accessToken: string,
  packetData: Pick<SingleWorkOrderGoogleDocData, "workOrder">,
  parentId: string,
  dateStr: string,
  titleSuffix = "",
): ReturnType<typeof createGoogleDocInFolder> {
  const title = `${packetData.workOrder.title} — Internal Packet ${dateStr}${titleSuffix}`;
  return createGoogleDocInFolder(accessToken, title, parentId);
}
