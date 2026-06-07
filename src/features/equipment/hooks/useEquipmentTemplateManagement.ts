import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EquipmentTemplateService } from '@/features/equipment/services/equipmentTemplateService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';

// Hook for removing template from single equipment
export const useRemoveTemplateFromEquipment = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: (equipmentId: string) =>
      EquipmentTemplateService.removeTemplateFromEquipment(equipmentId),
    onSuccess: () => {
      if (currentOrganization?.id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.equipment.list(currentOrganization.id) 
        });
      }
      toast.success('Template removed successfully');
    },
    onError: (error) => {
      console.error('Error removing template:', error);
      toast.error('Failed to remove template');
    }
  });
};

// Hook for bulk template assignment
export const useBulkAssignTemplate = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: ({ equipmentIds, templateId }: { equipmentIds: string[]; templateId: string }) =>
      EquipmentTemplateService.bulkAssignTemplate(equipmentIds, templateId),
    onSuccess: ({ successCount, errorCount }) => {
      if (currentOrganization?.id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.equipment.list(currentOrganization.id) 
        });
      }
      
      if (successCount > 0) {
        toast.success(
          `Template assigned to ${successCount} equipment record${successCount === 1 ? '' : 's'}${
            errorCount > 0 ? ` (${errorCount} failed)` : ''
          }`
        );
      }
      
      if (errorCount > 0 && successCount === 0) {
        toast.error('Failed to assign template to any equipment');
      }
    },
    onError: (error) => {
      console.error('Error in bulk template assignment:', error);
      toast.error('Failed to assign template');
    }
  });
};
