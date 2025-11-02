import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteWorkOrderCascade } from '@/services/deleteWorkOrderService';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';

export const useDeleteWorkOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: deleteWorkOrderCascade,
    onSuccess: () => {
      if (currentOrganization?.id) {
        // Invalidate all work order related queries with comprehensive pattern matching
        queryClient.invalidateQueries({ queryKey: ['enhanced-work-orders', currentOrganization.id] });
        queryClient.invalidateQueries({ queryKey: ['workOrders', currentOrganization.id] });
        queryClient.invalidateQueries({ queryKey: ['work-orders-filtered-optimized', currentOrganization.id] });
        queryClient.invalidateQueries({ queryKey: ['team-based-work-orders', currentOrganization.id] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats', currentOrganization.id] });
        queryClient.invalidateQueries({ queryKey: ['notifications', currentOrganization.id] });
        
        // Also invalidate with partial matching to catch any other work order queries
        queryClient.invalidateQueries({ 
          queryKey: ['work-orders'], 
          exact: false 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['workOrders'], 
          exact: false 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['workOrder'], 
          exact: false 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['dashboardStats'], 
          exact: false 
        });
      }

      toast({
        title: "Work Order Deleted",
        description: "The work order and all associated data have been permanently deleted.",
      });
    },
    onError: (error: unknown) => {
      console.error('Delete work order error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the work order. Please try again.",
        variant: "destructive",
      });
    }
  });
};