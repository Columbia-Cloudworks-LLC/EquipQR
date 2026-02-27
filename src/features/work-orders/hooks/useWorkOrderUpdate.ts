
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { showErrorToast, getErrorMessage } from '@/utils/errorHandling';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';

export interface UpdateWorkOrderData {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  estimatedHours?: number;
  hasPM?: boolean;
}

/** Result shape from mutationFn. */
interface UpdateWorkOrderResult {
  result: Record<string, unknown> | null;
  queuedOffline: boolean;
}

export const useUpdateWorkOrder = () => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const offlineCtx = useOfflineQueueOptional();

  return useMutation({
    mutationFn: async ({ workOrderId, data }: { workOrderId: string; data: UpdateWorkOrderData }): Promise<UpdateWorkOrderResult> => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('Organization or user not available');
      }

      const svc = new OfflineAwareWorkOrderService(currentOrganization.id, user.id);
      const result = await svc.updateWorkOrder(workOrderId, data);

      if (result.queuedOffline) {
        offlineCtx?.refresh();
        return { result: null, queuedOffline: true };
      }

      return { result: result.data, queuedOffline: false };
    },
    onSuccess: ({ queuedOffline }, variables) => {
      if (queuedOffline) {
        toast({
          title: 'Saved offline',
          description: 'Your changes will sync when your connection returns.',
        });
        return;
      }

      const { workOrderId } = variables;
      
      queryClient.invalidateQueries({ queryKey: ['enhanced-work-orders', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['workOrders', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders-filtered-optimized', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['team-based-work-orders', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['workOrder', currentOrganization?.id, workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['workOrder', 'enhanced', currentOrganization?.id, workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['preventativeMaintenance', workOrderId] });
      
      toast({
        title: 'Work Order Updated',
        description: 'Work order has been successfully updated.',
      });
    },
    onError: (error) => {
      console.error('Update work order error:', error);
      const errorMessage = getErrorMessage(error);
      const specificMessage = errorMessage.includes('permission')
        ? "You don't have permission to update this work order. Contact your administrator."
        : errorMessage.includes('not found')
        ? "Work order not found. It may have been deleted."
        : errorMessage.includes('validation') || errorMessage.includes('required')
        ? "Please check all required fields and try again."
        : "Failed to update work order. Please check your connection and try again.";
      
      toast({
        title: 'Update Failed',
        description: specificMessage,
        variant: 'destructive',
      });
      
      showErrorToast(error, 'Work Order Update');
    },
  });
};

