import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { EquipmentService, QuickEquipmentCreateData } from '@/features/equipment/services/EquipmentService';
import { useAppToast } from '@/hooks/useAppToast';

/**
 * Hook for quick equipment creation during work order creation.
 * 
 * Creates equipment with minimal data - auto-generates description and sets defaults.
 * Used when technicians need to create equipment inline while creating work orders.
 * 
 * @returns Mutation for creating equipment quickly
 */
export const useCreateQuickEquipment = () => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async (data: QuickEquipmentCreateData) => {
      if (!currentOrganization?.id) {
        throw new Error('Organization ID required');
      }
      
      const result = await EquipmentService.createQuick(currentOrganization.id, data);
      
      if (result.success && result.data) {
        return result.data;
      }
      
      throw new Error(result.error || 'Failed to create equipment');
    },
    onSuccess: (data) => {
      // Invalidate equipment queries to include the new equipment
      queryClient.invalidateQueries({ 
        queryKey: ['equipment', currentOrganization?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard-stats', currentOrganization?.id] 
      });
      
      toast({
        title: 'Equipment Created',
        description: `${data.name} has been added and is ready for the work order`,
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Create Equipment',
        description: error instanceof Error ? error.message : 'An error occurred while creating equipment',
        variant: 'error',
      });
    },
  });
};
