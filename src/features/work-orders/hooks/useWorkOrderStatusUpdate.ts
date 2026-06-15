
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { showErrorToast, getErrorMessage } from '@/utils/errorHandling';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';
import { invalidateWorkOrderCaches } from '@/features/work-orders/utils/invalidateWorkOrderQueries';

interface StatusUpdateData {
  workOrderId: string;
  newStatus: Database["public"]["Enums"]["work_order_status"];
  /** The work order's `updated_at` value as seen by the client before this change. Used for conflict detection when the update is queued offline. */
  serverUpdatedAt?: string;
}

/** Result shape from mutationFn. */
interface StatusUpdateResult {
  data: Record<string, unknown> | null;
  queuedOffline: boolean;
}

export const useWorkOrderStatusUpdate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const offlineCtx = useOfflineQueueOptional();

  return useMutation({
    mutationFn: async ({ workOrderId, newStatus, serverUpdatedAt }: StatusUpdateData): Promise<StatusUpdateResult> => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('Organization or user not available');
      }

      const svc = new OfflineAwareWorkOrderService(currentOrganization.id, user.id);
      const result = await svc.updateStatus(workOrderId, newStatus, serverUpdatedAt);

      if (result.queuedOffline) {
        offlineCtx?.refresh();
        return { data: null, queuedOffline: true };
      }

      return { data: result.data, queuedOffline: false };
    },
    onSuccess: ({ queuedOffline }, { workOrderId }) => {
      if (queuedOffline) {
        toast({
          title: 'Saved offline',
          description: 'Status change will sync when your connection returns.',
        });
        return;
      }

      if (currentOrganization?.id) {
        invalidateWorkOrderCaches(queryClient, currentOrganization.id, workOrderId);
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

