import { useCallback, useMemo } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { queryKeys } from '@/lib/queryKeys';
import { logger } from '@/utils/logger';
import { usePMTemplates } from '@/features/pm-templates/hooks/usePMTemplates';
import { useUpdateEquipment } from '@/features/equipment/hooks/useEquipment';

type Equipment = Tables<'equipment'>;

/**
 * Invalidate every query that derives from the equipment's effective PM
 * schedule (interval policies + PM status). Shared by team assignment and
 * PM template assignment, both of which change the inherited schedule.
 */
export function invalidatePMScheduleQueries(
  queryClient: QueryClient,
  equipmentId: string,
  organizationId: string,
): void {
  queryClient.invalidateQueries({
    queryKey: queryKeys.pmIntervalPolicies.effectiveByEquipment(equipmentId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.pmStatus.byEquipment(equipmentId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.pmStatus.byOrg(organizationId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.equipment.pmStatus(equipmentId),
  });
}

export interface UseEquipmentPMTemplateAssignmentReturn {
  pmTemplateOptions: { value: string; label: string }[];
  currentPMTemplateDisplay: string;
  handlePMTemplateAssignment: (templateId: string) => Promise<void>;
  isSaving: boolean;
}

/**
 * Self-contained PM template assignment state for an equipment record.
 * Backs the prominent PM template selector on the Work Orders tab (#1169).
 */
export function useEquipmentPMTemplateAssignment(
  equipment: Equipment,
  options: { canEdit: boolean },
): UseEquipmentPMTemplateAssignmentReturn {
  const { canEdit } = options;
  const queryClient = useQueryClient();
  const { data: pmTemplates = [] } = usePMTemplates({
    enabled: canEdit || !!equipment.default_pm_template_id,
  });
  const updateEquipmentMutation = useUpdateEquipment(equipment.organization_id);

  const pmTemplateOptions = useMemo(
    () => [
      { value: 'none', label: 'None' },
      ...pmTemplates.map((template) => ({ value: template.id, label: template.name })),
    ],
    [pmTemplates]
  );

  const currentPMTemplateDisplay = useMemo(() => {
    if (!equipment.default_pm_template_id) return 'None';
    const template = pmTemplates.find((t) => t.id === equipment.default_pm_template_id);
    return template?.name || 'Unknown Template';
  }, [equipment.default_pm_template_id, pmTemplates]);

  const handlePMTemplateAssignment = useCallback(
    async (templateId: string) => {
      try {
        const templateValue = templateId === 'none' ? null : templateId;
        if (import.meta.env.DEV) {
          logger.debug('Updating PM template assignment', { templateValue });
        }
        await updateEquipmentMutation.mutateAsync({
          id: equipment.id,
          data: { default_pm_template_id: templateValue },
        });
        invalidatePMScheduleQueries(queryClient, equipment.id, equipment.organization_id);
        toast.success('PM template assignment updated successfully');
      } catch (error) {
        logger.error('Error updating PM template assignment', error);
        toast.error('Failed to update PM template assignment');
        throw error;
      }
    },
    [equipment.id, equipment.organization_id, queryClient, updateEquipmentMutation]
  );

  return {
    pmTemplateOptions,
    currentPMTemplateDisplay,
    handlePMTemplateAssignment,
    isSaving: updateEquipmentMutation.isPending,
  };
}
