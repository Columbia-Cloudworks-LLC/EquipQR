
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { showErrorToast, getErrorMessage } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';
import { workOrderKeys } from '@/features/work-orders/hooks/useWorkOrders';
import { workOrders as workOrderQueryKeys, notifications as notificationQueryKeys } from '@/lib/queryKeys';

interface AcceptWorkOrderParams {
  workOrderId: string;
  organizationId: string;
  assigneeId?: string;
}

export const useWorkOrderAcceptance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workOrderId, organizationId, assigneeId }: AcceptWorkOrderParams) => {
      // Get organization member count to determine if single-user org
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      const isSingleUserOrg = (orgMembers?.length || 0) === 1;

      // Determine the target status based on assignment and org size
      let targetStatus: Database["public"]["Enums"]["work_order_status"] = 'accepted';
      
      if (isSingleUserOrg) {
        // Single user org: go directly to in_progress with auto-assignment
        targetStatus = 'in_progress';
      } else if (assigneeId) {
        // Multi-user org with assignment: go to assigned
        targetStatus = 'assigned';
      }
      // Multi-user org without assignment: stay at accepted

      // Build update object
      const updateData: Database["public"]["Tables"]["work_orders"]["Update"] = {
        status: targetStatus,
        acceptance_date: new Date().toISOString()
      };

      // Add assignment if provided or if single-user org
      if (assigneeId || isSingleUserOrg) {
        updateData.assignee_id = assigneeId;
      }

      // Update the work order (org-scoped for multi-tenancy defense in depth)
      const { data, error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, { workOrderId, organizationId }) => {
      // Invalidate the specific work order detail so the details page re-renders immediately
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(organizationId, workOrderId),
      });
      // Invalidate all work order list queries
      queryClient.invalidateQueries({ queryKey: workOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
      // Legacy / alternate key shapes for backward compatibility
      queryClient.invalidateQueries({ queryKey: workOrderQueryKeys.enhancedList(organizationId) });
      queryClient.invalidateQueries({ queryKey: workOrderQueryKeys.legacyList(organizationId) });
      queryClient.invalidateQueries({ queryKey: workOrderQueryKeys.optimized(organizationId) });
      queryClient.invalidateQueries({ queryKey: workOrderQueryKeys.byId(organizationId, workOrderId) });
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.byOrg(organizationId) });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', organizationId] });
      toast.success('Work order accepted successfully');
    },
    onError: (error) => {
      logger.error('Error accepting work order', error);
      const errorMessage = getErrorMessage(error);
      const specificMessage = errorMessage.includes('permission')
        ? "You don't have permission to accept this work order. Contact your administrator."
        : errorMessage.includes('not found')
        ? "Work order not found. It may have been deleted or reassigned."
        : errorMessage.includes('already')
        ? "This work order has already been accepted by someone else."
        : "Failed to accept work order. Please check your connection and try again.";
      
      toast.error('Work Order Acceptance Failed', { description: specificMessage });
      showErrorToast(error, 'Work Order Acceptance');
    }
  });
};


