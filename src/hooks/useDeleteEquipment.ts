import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteEquipmentCascade } from '@/services/deleteEquipmentService';
import { useToast } from '@/hooks/use-toast';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';

export const useDeleteEquipment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentOrganization } = useSimpleOrganization();

  return useMutation({
    mutationFn: ({ equipmentId, orgId }: { equipmentId: string; orgId: string }) => 
      deleteEquipmentCascade(equipmentId, orgId),
    onSuccess: () => {
      if (currentOrganization?.id) {
        // Invalidate all equipment related queries
        queryClient.invalidateQueries({ queryKey: ['equipment', currentOrganization.id] });
        queryClient.invalidateQueries({ queryKey: ['equipment-by-id'] });
        queryClient.invalidateQueries({ queryKey: ['work-orders'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      }

      toast({
        title: "Equipment Deleted",
        description: "The equipment and all associated data have been permanently deleted.",
      });
    },
    onError: (error: unknown) => {
      console.error('Delete equipment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete equipment. Please try again.';
      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });
};