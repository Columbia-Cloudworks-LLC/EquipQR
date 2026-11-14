import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { resolveTeamEquipmentFolder } from "../_shared/google-docs-export-support.ts";
import { buildSingleWorkOrderGoogleDocData } from "../_shared/work-order-google-docs-single-data.ts";

export interface OrgExportDestination {
  parent_id: string;
  folder_by_team: boolean | null;
  folder_by_equipment: boolean | null;
}

export async function resolvePdfUploadParentId(
  supabase: SupabaseClient,
  params: {
    accessToken: string;
    organizationId: string;
    workOrderId: string;
    destination: OrgExportDestination;
  },
): Promise<{ parentId: string; warnings: string[] }> {
  const warnings: string[] = [];
  let targetParentId = params.destination.parent_id;
  try {
    const packetData = await buildSingleWorkOrderGoogleDocData(
      supabase,
      params.organizationId,
      params.workOrderId,
    );

    targetParentId = await resolveTeamEquipmentFolder(
      params.accessToken,
      params.destination,
      packetData,
    );
  } catch (folderError) {
    const msg = folderError instanceof Error ? folderError.message : String(folderError);
    console.error("[UPLOAD-TO-GOOGLE-DRIVE] Subfolder resolution failed, using root:", msg);
    warnings.push("Could not create team/equipment subfolders; document saved to root destination.");
  }

  return { parentId: targetParentId, warnings };
}
