import { withResolvedEquipmentImages } from '@/services/imageUploadService';
type RowWithTeamJoin = {
  id?: string;
  image_url?: string | null;
  team?: { name?: string } | null;
};

export function flattenEquipmentRowsWithTeamName<T extends RowWithTeamJoin>(
  rows: T[],
): Array<T & { team_name: string | undefined }> {
  return (rows || []).map((row) => ({
    ...row,
    team_name: row.team?.name ?? undefined,
  }));
}

export async function flattenAndResolveEquipmentImages<T extends RowWithTeamJoin>(
  rows: T[],
): Promise<Array<T & { team_name: string | undefined }>> {
  const flattened = flattenEquipmentRowsWithTeamName(rows);
  return withResolvedEquipmentImages(flattened);
}
