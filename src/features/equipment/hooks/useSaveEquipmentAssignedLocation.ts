import { useCallback } from 'react';
import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import { useUpdateEquipment } from '@/features/equipment/hooks/useEquipment';
import { persistEquipmentAssignedLocation } from '@/features/equipment/hooks/persistEquipmentAssignedLocation';

export function useSaveEquipmentAssignedLocation(
  organizationId: string | undefined,
  equipmentId: string | undefined,
) {
  const updateEquipmentMutation = useUpdateEquipment(organizationId || '');

  const saveAssignedLocation = useCallback(
    async (data: PlaceLocationData) => {
      if (!equipmentId) {
        throw new Error('Equipment ID is required');
      }
      await persistEquipmentAssignedLocation(
        equipmentId,
        data,
        updateEquipmentMutation.mutateAsync,
      );
    },
    [equipmentId, updateEquipmentMutation.mutateAsync],
  );

  return {
    saveAssignedLocation,
    isSavingLocation: updateEquipmentMutation.isPending,
  };
}
