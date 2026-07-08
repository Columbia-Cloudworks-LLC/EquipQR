import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import type { PlaceLocationData } from '@/components/ui/GooglePlacesAutocomplete';
import type { EquipmentTeamSummary } from '@/features/equipment/services/EquipmentService';
import { applyEquipmentUpdateRules } from '@/utils/object-utils';
import { logger } from '@/utils/logger';
import { persistEquipmentAssignedLocation } from '@/features/equipment/hooks/persistEquipmentAssignedLocation';
import { invalidatePMScheduleQueries } from '@/features/equipment/hooks/useEquipmentPMTemplateAssignment';

type Equipment = Tables<'equipment'>;

type UpdateEquipmentMutation = {
  mutateAsync: (args: { id: string; data: Partial<Equipment> }) => Promise<unknown>;
};

export function useEquipmentDetailsTabActions({
  equipment,
  organizationId,
  teams,
  updateEquipmentMutation,
}: {
  equipment: Equipment;
  /** Org id from the trusted organization context (not the record field). */
  organizationId: string | undefined;
  teams: EquipmentTeamSummary[];
  updateEquipmentMutation: UpdateEquipmentMutation;
}) {
  const queryClient = useQueryClient();

  const invalidateInheritedPMSchedule = useCallback(() => {
    invalidatePMScheduleQueries(queryClient, equipment.id, organizationId);
  }, [equipment.id, organizationId, queryClient]);

  const handleFieldUpdate = useCallback(
    async (field: keyof Equipment, value: string) => {
      try {
        if (import.meta.env.DEV) {
          logger.debug(`Updating equipment field`, { field: String(field), value });
        }
        const updateData = applyEquipmentUpdateRules({ [field]: value } as Partial<Equipment>);
        await updateEquipmentMutation.mutateAsync({
          id: equipment.id,
          data: updateData,
        });
        toast.success(`${String(field)} updated successfully`);
      } catch (error) {
        logger.error(`Error updating ${String(field)}`, error);
        toast.error(`Failed to update ${String(field)}`);
        throw error;
      }
    },
    [equipment.id, updateEquipmentMutation]
  );

  const handleCustomAttributesUpdate = useCallback(
    async (newAttributes: Record<string, string>) => {
      try {
        if (import.meta.env.DEV) {
          logger.debug('Updating custom attributes', { newAttributes });
        }
        await updateEquipmentMutation.mutateAsync({
          id: equipment.id,
          data: { custom_attributes: newAttributes },
        });
        toast.success('Custom attributes updated successfully');
      } catch (error) {
        logger.error('Error updating custom attributes', error);
        toast.error('Failed to update custom attributes');
        throw error;
      }
    },
    [equipment.id, updateEquipmentMutation]
  );

  const handleTeamAssignment = useCallback(
    async (teamId: string) => {
      try {
        const teamValue = teamId === 'unassigned' ? null : teamId;
        if (import.meta.env.DEV) {
          logger.debug('Updating team assignment', { teamValue });
        }
        await updateEquipmentMutation.mutateAsync({
          id: equipment.id,
          data: { team_id: teamValue },
        });
        invalidateInheritedPMSchedule();
        toast.success('Team assignment updated successfully');
      } catch (error) {
        logger.error('Error updating team assignment', error);
        toast.error('Failed to update team assignment');
        throw error;
      }
    },
    [equipment.id, invalidateInheritedPMSchedule, updateEquipmentMutation]
  );

  const saveAssignedLocation = useCallback(
    async (data: PlaceLocationData) => {
      await persistEquipmentAssignedLocation(equipment.id, data, updateEquipmentMutation.mutateAsync);
    },
    [equipment.id, updateEquipmentMutation.mutateAsync],
  );

  const teamOptions = useMemo(
    () => [
      { value: 'unassigned', label: 'Unassigned' },
      ...teams.map((team) => ({ value: team.id, label: team.name })),
    ],
    [teams]
  );

  const getCurrentTeamDisplay = useCallback(() => {
    if (!equipment.team_id) return 'Unassigned';
    const team = teams.find((t) => t.id === equipment.team_id);
    return team?.name || 'Unknown Team';
  }, [equipment.team_id, teams]);

  return {
    handleFieldUpdate,
    handleCustomAttributesUpdate,
    handleTeamAssignment,
    saveAssignedLocation,
    teamOptions,
    getCurrentTeamDisplay,
  };
}
