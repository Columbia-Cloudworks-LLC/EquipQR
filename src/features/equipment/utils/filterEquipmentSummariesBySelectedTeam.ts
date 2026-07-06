import { UNASSIGNED_TEAM_ID, type SelectedTeamId } from '@/contexts/selected-team-context';
import type { EquipmentSummary } from '@/features/equipment/services/EquipmentService';

export function filterEquipmentSummariesBySelectedTeam(
  equipment: EquipmentSummary[],
  selectedTeamId: SelectedTeamId,
): EquipmentSummary[] {
  if (selectedTeamId === null) {
    return equipment;
  }
  if (selectedTeamId === UNASSIGNED_TEAM_ID) {
    return equipment.filter((item) => item.team_id === null);
  }
  return equipment.filter((item) => item.team_id === selectedTeamId);
}
