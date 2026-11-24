import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';
import { invalidateWorkOrderCaches } from '@/features/work-orders/utils/invalidateWorkOrderQueries';

type WorkOrderStatus = Database['public']['Enums']['work_order_status'];

interface QuickAssignmentVariables {
  workOrderId: string;
  assigneeId?: string | null;
  organizationId: string;
  /** Preserve workflow state when reassigning from details/list inline editors. */
  currentStatus?: WorkOrderStatus;
}

export function resolveStatusAfterAssignment(
  currentStatus: WorkOrderStatus | undefined,
  assigneeId: string | null | undefined,
): WorkOrderStatus {
  if (!currentStatus) {
    return assigneeId ? 'assigned' : 'submitted';
  }

  if (assigneeId) {
    if (currentStatus === 'submitted' || currentStatus === 'accepted') {
      return 'assigned';
    }
    return currentStatus;
  }

  if (currentStatus === 'assigned' || currentStatus === 'in_progress') {
    return 'accepted';
  }

  return currentStatus;
}

export const useQuickWorkOrderAssignment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const offlineCtx = useOfflineQueueOptional();

  return useMutation({
    mutationFn: async ({ workOrderId, assigneeId, currentStatus, organizationId }: QuickAssignmentVariables) => {
      const newStatus = resolveStatusAfterAssignment(currentStatus, assigneeId);

      // No connection: queue the assignment with its status so it is sent
      // when the signal returns.
      if (!navigator.onLine && user?.id) {
        const service = new OfflineAwareWorkOrderService(organizationId, user.id);
        await service.updateStatus(workOrderId, newStatus, undefined, assigneeId || null);
        offlineCtx?.refresh();
        return { queuedOffline: true };
      }

      const updateData: Database['public']['Tables']['work_orders']['Update'] = {
        assignee_id: assigneeId || null,
        status: newStatus,
      };

      if (assigneeId) {
        if (
          newStatus === 'assigned'
          || newStatus === 'accepted'
          || newStatus === 'in_progress'
        ) {
          updateData.acceptance_date = new Date().toISOString();
        }
      } else if (newStatus === 'accepted' || newStatus === 'submitted') {
        updateData.acceptance_date = null;
      }

      const { error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', workOrderId);

      if (error) throw error;
      return { queuedOffline: false };
    },
    onSuccess: ({ queuedOffline }, { assigneeId, organizationId, workOrderId }: QuickAssignmentVariables) => {
      if (queuedOffline) {
        toast.success('Saved offline', {
          description: 'The assignment will sync when your connection returns.',
        });
        return;
      }
      const message = assigneeId ? 'Work order assigned successfully' : 'Work order unassigned successfully';
      toast.success(message);

      invalidateWorkOrderCaches(queryClient, organizationId, workOrderId);
    },
    onError: (error) => {
      logger.error('Error assigning work order', error);
      toast.error('Failed to assign work order');
    },
  });
};