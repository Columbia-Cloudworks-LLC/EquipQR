
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { showErrorToast, getErrorMessage } from '@/utils/errorHandling';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';
import { workOrders, organization, preventiveMaintenance } from '@/lib/queryKeys';

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
      const orgId = currentOrganization?.id ?? '';

      queryClient.invalidateQueries({ queryKey: workOrders.enhancedList(orgId) });
      queryClient.invalidateQueries({ queryKey: workOrders.legacyList(orgId) });
      queryClient.invalidateQueries({ queryKey: workOrders.optimized(orgId) });
      queryClient.invalidateQueries({ queryKey: workOrders.teamBasedList(orgId) });
      queryClient.invalidateQueries({ queryKey: organization(orgId).dashboardStats() });
      queryClient.invalidateQueries({ queryKey: workOrders.legacyById(orgId, workOrderId) });
      queryClient.invalidateQueries({ queryKey: workOrders.enhancedById(orgId, workOrderId) });
      queryClient.invalidateQueries({ queryKey: preventiveMaintenance.byWorkOrder(workOrderId) });
      
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

