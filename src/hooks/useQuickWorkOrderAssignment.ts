import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useQuickWorkOrderAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workOrderId, 
      assigneeId, 
      organizationId 
    }: { 
      workOrderId: string; 
      assigneeId?: string | null; 
      organizationId: string 
    }) => {
      // Determine the new status based on assignment
      let newStatus = 'submitted';
      if (assigneeId) {
        newStatus = 'assigned';
      }

      const updateData: any = {
        assignee_id: assigneeId || null,
        status: newStatus
      };

      // Only set acceptance_date if actually assigning
      if (assigneeId) {
        updateData.acceptance_date = new Date().toISOString();
      } else {
        updateData.acceptance_date = null;
      }

      const { error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', workOrderId);

      if (error) throw error;
    },
    onSuccess: (_, { assigneeId, organizationId, workOrderId }) => {
      const message = assigneeId ? 'Work order assigned successfully' : 'Work order unassigned successfully';
      toast.success(message);
      
      // Invalidate specific work order queries (used by work order details page)
      queryClient.invalidateQueries({ queryKey: ['workOrder', organizationId, workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['workOrder', 'enhanced', organizationId, workOrderId] });
      
      // Invalidate all work order related queries with partial matching
      queryClient.invalidateQueries({ queryKey: ['enhanced-work-orders', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['workOrders', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['work-orders-filtered-optimized', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['team-based-work-orders', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', organizationId] });
      
      // Also invalidate with partial matching to catch any other work order queries
      queryClient.invalidateQueries({ 
        queryKey: ['work-orders'], 
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['workOrders'], 
        exact: false 
      });
    },
    onError: (error) => {
      console.error('Error assigning work order:', error);
      toast.error('Failed to assign work order');
    },
  });
};