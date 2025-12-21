
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { showErrorToast, getErrorMessage } from '@/utils/errorHandling';

interface StatusUpdateData {
  workOrderId: string;
  newStatus: Database["public"]["Enums"]["work_order_status"];
}

export const useWorkOrderStatusUpdate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async ({ workOrderId, newStatus }: StatusUpdateData) => {
      const updateData: Database["public"]["Tables"]["work_orders"]["Update"] = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Set completed_date when status is completed
      if (newStatus === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }

      // Clear completed_date when reopening
      if (newStatus === 'submitted' || newStatus === 'accepted' || newStatus === 'assigned' || newStatus === 'in_progress') {
        updateData.completed_date = null;
      }

      const { data, error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', workOrderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
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
        title: "Status Updated",
        description: "Work order status has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      console.error('Status update error:', error);
      const errorMessage = getErrorMessage(error);
      const specificMessage = errorMessage.includes('permission')
        ? "You don't have permission to change this work order status. Contact your administrator."
        : errorMessage.includes('not found')
        ? "Work order not found. It may have been deleted or moved."
        : errorMessage.includes('invalid')
        ? "Invalid status transition. Please refresh the page and try again."
        : "Failed to update work order status. Please check your connection and try again.";
      
      toast({
        title: "Status Update Failed",
        description: specificMessage,
        variant: "destructive",
      });
      
      showErrorToast(error, 'Work Order Status Update');
    }
  });
};


