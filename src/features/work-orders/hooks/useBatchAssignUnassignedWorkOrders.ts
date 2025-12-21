import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useBatchAssignUnassignedWorkOrders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Check if this is a single-user organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('member_count')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      if (orgData.member_count !== 1) {
        throw new Error('This function is only for single-user organizations');
      }

      // Get all unassigned submitted work orders
      const { data: unassignedOrders, error: ordersError } = await supabase
        .from('work_orders')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('status', 'submitted')
        .is('assignee_id', null);

      if (ordersError) throw ordersError;

      if (unassignedOrders && unassignedOrders.length > 0) {
        // Batch update all unassigned work orders
        const { error: updateError } = await supabase
          .from('work_orders')
          .update({
            assignee_id: user.id,
            status: 'assigned',
            acceptance_date: new Date().toISOString()
          })
          .in('id', unassignedOrders.map(order => order.id));

        if (updateError) throw updateError;

        return unassignedOrders.length;
      }

      return 0;
    },
    onSuccess: (count, organizationId) => {
      if (count > 0) {
        toast.success(`Assigned ${count} work order${count !== 1 ? 's' : ''} to you`);
      } else {
        toast.info('No unassigned work orders found');
      }
      
      // Invalidate relevant queries with standardized keys
      queryClient.invalidateQueries({ queryKey: ['enhanced-work-orders', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['workOrders', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['work-orders-filtered-optimized', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', organizationId] });
    },
    onError: (error) => {
      console.error('Error batch assigning work orders:', error);
      toast.error('Failed to assign work orders');
    },
  });
};

