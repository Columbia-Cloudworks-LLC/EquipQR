
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import type { EquipmentNotesPermissions } from '@/types/permissions';

export const useEquipmentNotesPermissions = (
  equipmentTeamId?: string
): EquipmentNotesPermissions => {
  const permissions = useUnifiedPermissions();
  return permissions.getEquipmentNotesPermissions(equipmentTeamId);
};
