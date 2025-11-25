import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EquipmentTemplateService } from '@/services/equipmentTemplateService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';

// Hook for assigning template to single equipment
export const useAssignTemplateToEquipment = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: ({ equipmentId, templateId }: { equipmentId: string; templateId: string }) =>
      EquipmentTemplateService.assignTemplateToEquipment(equipmentId, templateId),
    onSuccess: () => {
      if (currentOrganization?.id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.equipment.list(currentOrganization.id) 
        });
      }
      toast.success('Template assigned successfully');
    },
    onError: (error) => {
      console.error('Error assigning template:', error);
      toast.error('Failed to assign template');
    }
  });
};

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

// Hook for bulk template removal
export const useBulkRemoveTemplates = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: (equipmentIds: string[]) =>
      EquipmentTemplateService.bulkRemoveTemplates(equipmentIds),
    onSuccess: ({ successCount, errorCount }) => {
      if (currentOrganization?.id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.equipment.list(currentOrganization.id) 
        });
      }
      
      if (successCount > 0) {
        toast.success(
          `Template removed from ${successCount} equipment record${successCount === 1 ? '' : 's'}${
            errorCount > 0 ? ` (${errorCount} failed)` : ''
          }`
        );
      }
      
      if (errorCount > 0 && successCount === 0) {
        toast.error('Failed to remove template from any equipment');
      }
    },
    onError: (error) => {
      console.error('Error in bulk template removal:', error);
      toast.error('Failed to remove templates');
    }
  });
};

// Hook for bulk template change
export const useBulkChangeTemplate = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: ({ equipmentIds, newTemplateId }: { equipmentIds: string[]; newTemplateId: string }) =>
      EquipmentTemplateService.bulkChangeTemplate(equipmentIds, newTemplateId),
    onSuccess: ({ successCount, errorCount }) => {
      if (currentOrganization?.id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.equipment.list(currentOrganization.id) 
        });
      }
      
      if (successCount > 0) {
        toast.success(
          `Template changed for ${successCount} equipment record${successCount === 1 ? '' : 's'}${
            errorCount > 0 ? ` (${errorCount} failed)` : ''
          }`
        );
      }
      
      if (errorCount > 0 && successCount === 0) {
        toast.error('Failed to change template for any equipment');
      }
    },
    onError: (error) => {
      console.error('Error in bulk template change:', error);
      toast.error('Failed to change templates');
    }
  });
};