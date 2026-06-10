import { withResolvedEquipmentImages } from '@/services/imageUploadService';
import type { EquipmentWithTeam } from '@/features/equipment/services/EquipmentService';

type RowWithTeamJoin = Record<string, unknown> & {
  team?: { name?: string } | null;
};

export function flattenEquipmentRowsWithTeamName<T extends RowWithTeamJoin>(
  rows: T[],
): EquipmentWithTeam[] {
  return (rows || []).map((row) => ({
    ...row,
    team_name: (row.team as { name?: string } | null | undefined)?.name ?? undefined,
  })) as unknown as EquipmentWithTeam[];
}

export async function flattenAndResolveEquipmentImages<T extends RowWithTeamJoin>(
  rows: T[],
): Promise<EquipmentWithTeam[]> {
  const flattened = flattenEquipmentRowsWithTeamName(rows);
  return withResolvedEquipmentImages(flattened);
}
