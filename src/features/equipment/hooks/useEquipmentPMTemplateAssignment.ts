import { useCallback, useMemo } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { Tables } from '@/integrations/supabase/types';
import { queryKeys } from '@/lib/queryKeys';
import { logger } from '@/utils/logger';
import { useOrganization } from '@/contexts/OrganizationContext';
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
  organizationId?: string,
): void {
  queryClient.invalidateQueries({
    queryKey: queryKeys.pmIntervalPolicies.effectiveByEquipment(equipmentId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.pmStatus.byEquipment(equipmentId),
  });
  // Never invalidate an empty-string org key; skip when org context is absent.
  if (organizationId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.pmStatus.byOrg(organizationId),
    });
  }
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
  // Multi-tenant scoping: org id must come from the trusted organization
  // context, never from a record field. Kept undefined (not '') when absent.
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  const { data: pmTemplates = [] } = usePMTemplates({
    enabled: canEdit || !!equipment.default_pm_template_id,
  });
  const updateEquipmentMutation = useUpdateEquipment(organizationId);

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

  // Success/error toasts are owned by useUpdateEquipment; no extra toasts here.
  const handlePMTemplateAssignment = useCallback(
    async (templateId: string) => {
      // Defense-in-depth: re-validate permission and org context at the
      // mutation boundary, not only via UI gating.
      if (!canEdit) {
        logger.error('Blocked PM template assignment without edit permission');
        throw new Error('You do not have permission to change the PM template.');
      }
      if (!organizationId) {
        logger.error('Blocked PM template assignment without an active organization');
        throw new Error('No active organization selected.');
      }
      try {
        const templateValue = templateId === 'none' ? null : templateId;
        if (import.meta.env.DEV) {
          logger.debug('Updating PM template assignment', { templateValue });
        }
        await updateEquipmentMutation.mutateAsync({
          id: equipment.id,
          data: { default_pm_template_id: templateValue },
        });
        invalidatePMScheduleQueries(queryClient, equipment.id, organizationId);
      } catch (error) {
        logger.error('Error updating PM template assignment', error);
        throw error;
      }
    },
    [canEdit, equipment.id, organizationId, queryClient, updateEquipmentMutation]
  );

  return {
    pmTemplateOptions,
    currentPMTemplateDisplay,
    handlePMTemplateAssignment,
    isSaving: updateEquipmentMutation.isPending,
  };
}
