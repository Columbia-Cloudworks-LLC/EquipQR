import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { QuickEquipmentCreateData } from '@/features/equipment/services/EquipmentService';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { useAppToast } from '@/hooks/useAppToast';

/**
 * Hook for quick equipment creation during work order creation.
 *
 * Creates equipment with minimal data - auto-generates description and sets defaults.
 * Used when technicians need to create equipment inline while creating work orders.
 * Supports offline queueing when network is unavailable.
 *
 * @returns Mutation for creating equipment quickly
 */
export const useCreateQuickEquipment = () => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const offlineCtx = useOfflineQueueOptional();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async (data: QuickEquipmentCreateData) => {
      if (!currentOrganization?.id) {
        throw new Error('Organization ID required');
      }
      if (!user?.id) {
        throw new Error('User not found');
      }

      const service = new OfflineAwareWorkOrderService(currentOrganization.id, user.id);
      const result = await service.createEquipmentQuick(data);

      if (result.queuedOffline) {
        const stableId = `offline-equip-${result.queueItemId}`;
        return { id: stableId, name: data.name, queuedOffline: true, queueItemId: result.queueItemId };
      }
      if (result.data) {
        return result.data;
      }
      throw new Error('Failed to create equipment');
    },
    onSuccess: (data) => {
      const queuedOffline = 'queuedOffline' in data && data.queuedOffline;
      if (queuedOffline) {
        toast({
          title: 'Saved offline',
          description: 'Equipment will be created when you reconnect.',
          variant: 'success',
        });
        offlineCtx?.refresh();
      } else {
        queryClient.invalidateQueries({
          queryKey: ['equipment', currentOrganization?.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['dashboard-stats', currentOrganization?.id],
        });
        toast({
          title: 'Equipment Created',
          description: `${data.name} has been added and is ready for the work order`,
          variant: 'success',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to Create Equipment',
        description: error instanceof Error ? error.message : 'An error occurred while creating equipment',
        variant: 'error',
      });
    },
  });
};
