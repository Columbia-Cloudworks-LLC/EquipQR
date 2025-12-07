
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { EquipmentNote } from '@/types/equipmentNotes';

export interface EquipmentNotesPermissions {
  canViewNotes: boolean;
  canAddPublicNote: boolean;
  canAddPrivateNote: boolean;
  canEditOwnNote: (note: EquipmentNote) => boolean;
  canEditAnyNote: boolean;
  canDeleteOwnNote: (note: EquipmentNote) => boolean;
  canDeleteAnyNote: boolean;
  canUploadImages: boolean;
  canDeleteImages: boolean;
  canSetDisplayImage: boolean;
}

export const useEquipmentNotesPermissions = (
  equipmentTeamId?: string
): EquipmentNotesPermissions => {
  const permissions = useUnifiedPermissions();
  return permissions.getEquipmentNotesPermissions(equipmentTeamId);
};
