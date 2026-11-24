
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import {
  getWorkOrderCosts,
  createWorkOrderCost,
  deleteWorkOrderCostWithInventoryInfo,
  updateWorkOrderCostWithQuantityTracking,
  type UpdateWorkOrderCostData
} from '@/features/work-orders/services/workOrderCostsService';
import { adjustInventoryQuantity } from '@/features/inventory/services/inventoryService';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { isOfflinePlaceholderId } from '@/services/offlineQueuePlaceholders';
import { useQueuedItems } from '@/features/offline-queue/hooks/useQueuedLookups';
import {
  findQueuedPartUse,
  mergeQueuedPartUseCosts,
  queuedPartUseCosts,
} from '@/features/offline-queue/utils/queuedPartUse';
import type { WorkOrderCost } from '@/features/work-orders/types/workOrderCosts';
import { inventory as inventoryQueryKeys } from '@/lib/queryKeys';

export const useWorkOrderCosts = (workOrderId: string) => {
  // A work order created offline has no costs on the server yet, and its
  // placeholder id is never sent there.
  const isUnsynced = isOfflinePlaceholderId(workOrderId);
  const query = useQuery({
    queryKey: ['work-order-costs', workOrderId],
    queryFn: () => getWorkOrderCosts(workOrderId),
    enabled: !!workOrderId && !isUnsynced
  });

  // Parts added from inventory with no connection wait in the offline queue;
  // show their cost lines with the saved ones.
  const queuedItems = useQueuedItems();
  const saved = query.data ?? (isUnsynced ? NO_COSTS : undefined);
  const withQueued = useMemo(() => {
    const queued = queuedPartUseCosts(workOrderId, queuedItems);
    if (queued.length === 0) return saved;
    return mergeQueuedPartUseCosts(saved ?? NO_COSTS, workOrderId, queuedItems);
  }, [saved, workOrderId, queuedItems]);

  if (withQueued === query.data) return query;
  return { ...query, data: withQueued, isPending: false, isLoading: false, isError: false, error: null };
};

const NO_COSTS: WorkOrderCost[] = [];

/** Offline queue access for the cost mutations that have to act on a queued part. */
function useQueuedPartActions() {
  const offlineCtx = useOfflineQueueOptional();
  return {
    /**
     * The queued part use behind a cost line, or `undefined` when the line is
     * on the server. Throws once sync has started sending that part: from
     * the first attempt on (`lastMovementBeforeReplay` is set just before
     * it) the stock may already be deducted, even if the answer was lost, so
     * the item can no longer be changed or dropped from the queue.
     */
    findQueued: (costId: string) => {
      const queued = findQueuedPartUse(costId, offlineCtx?.queuedItems ?? []);
      const sendingStarted =
        queued &&
        (queued.status === 'processing' ||
          queued.payload.stockDeducted ||
          queued.payload.lastMovementBeforeReplay !== undefined);
      if (sendingStarted) {
        throw new Error('This part is syncing right now. Try again in a moment.');
      }
      return queued;
    },
    offlineCtx,
  };
}

export const useCreateWorkOrderCost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWorkOrderCost,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-costs', data.work_order_id] });
      toast.success('Cost item added successfully');
    },
    onError: (error) => {
      logger.error('Error creating cost item', error);
      toast.error('Failed to add cost item');
    }
  });
};

/**
 * Delete a cost item with inventory restoration.
 * If the cost was created from inventory, restores the quantity back to the source inventory item.
 */
export const useDeleteWorkOrderCostWithInventoryRestore = () => {
  const queryClient = useQueryClient();
  const { findQueued, offlineCtx } = useQueuedPartActions();

  return useMutation({
    mutationFn: async ({ 
      costId, 
      organizationId 
    }: { 
      costId: string; 
      organizationId: string;
    }) => {
      // A part added offline that has not synced: take it out of the queue.
      // Nothing was written or deducted, so there is nothing to restore.
      const queued = findQueued(costId);
      if (queued) {
        offlineCtx?.removeItem(queued.id);
        return { inventoryRestored: false, quantity: 0 };
      }

      // Delete the cost and get inventory info if applicable
      const inventoryInfo = await deleteWorkOrderCostWithInventoryInfo(costId);

      // If this cost was from inventory, restore the quantity
      if (inventoryInfo) {
        await adjustInventoryQuantity(organizationId, {
          itemId: inventoryInfo.inventory_item_id,
          delta: inventoryInfo.quantity, // Positive to add back to inventory
          reason: 'Restored from deleted work order cost',
          workOrderId: inventoryInfo.work_order_id
        });
      }

      return { inventoryRestored: !!inventoryInfo, quantity: inventoryInfo?.quantity ?? 0 };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-costs'] });
      queryClient.invalidateQueries({
        queryKey: inventoryQueryKeys.listPrefix(variables.organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: inventoryQueryKeys.metadata(variables.organizationId),
      });
      
      if (result.inventoryRestored) {
        toast.success(`Cost deleted. ${result.quantity} unit(s) restored to inventory.`);
      } else {
        toast.success('Cost item deleted successfully');
      }
    },
    onError: (error) => {
      logger.error('Error deleting cost item with inventory restore', error);
      toast.error('Failed to delete cost item');
    }
  });
};

/**
 * Update a cost item with inventory adjustment when quantity changes.
 * Calculates delta and adjusts source inventory accordingly.
 */
export const useUpdateWorkOrderCostWithInventory = () => {
  const queryClient = useQueryClient();
  const { findQueued, offlineCtx } = useQueuedPartActions();

  return useMutation({
    mutationFn: async ({ 
      costId, 
      updateData,
      organizationId
    }: { 
      costId: string; 
      updateData: UpdateWorkOrderCostData;
      organizationId: string;
    }) => {
      // A part added offline that has not synced: change it in the queue, so
      // the quantity it will take from stock changes with it.
      const queued = findQueued(costId);
      if (queued) {
        const quantity = updateData.quantity ?? queued.payload.quantity;
        const changed = {
          description: updateData.description ?? queued.payload.description,
          quantity,
          unitPriceCents: updateData.unit_price_cents ?? queued.payload.unitPriceCents,
        };
        if (!offlineCtx?.queueServiceInstance?.updatePayload(queued.id, changed)) {
          throw new Error('Could not save the change on this device.');
        }
        offlineCtx.refresh();
        const [cost] = queuedPartUseCosts(queued.payload.workOrderId, [
          { ...queued, payload: { ...queued.payload, ...changed } },
        ]);
        return { cost, inventoryAdjusted: false, delta: 0 };
      }

      // Update cost and get inventory adjustment info
      const result = await updateWorkOrderCostWithQuantityTracking(costId, updateData);

      // If there's an inventory adjustment needed, apply it
      if (result.inventoryAdjustment) {
        const { inventory_item_id, delta } = result.inventoryAdjustment;
        
        // delta > 0 means returning to inventory (quantity decreased)
        // delta < 0 means taking more from inventory (quantity increased)
        await adjustInventoryQuantity(organizationId, {
          itemId: inventory_item_id,
          delta,
          reason: delta > 0 
            ? 'Returned from work order cost quantity reduction'
            : 'Used in work order cost quantity increase',
          workOrderId: result.cost.work_order_id
        });
      }

      return { 
        cost: result.cost, 
        inventoryAdjusted: !!result.inventoryAdjustment,
        delta: result.inventoryAdjustment?.delta ?? 0
      };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-costs', result.cost.work_order_id] });
      queryClient.invalidateQueries({
        queryKey: inventoryQueryKeys.listPrefix(variables.organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: inventoryQueryKeys.metadata(variables.organizationId),
      });
      
      if (result.inventoryAdjusted) {
        const action = result.delta > 0 ? 'restored to' : 'taken from';
        toast.success(`Cost updated. ${Math.abs(result.delta)} unit(s) ${action} inventory.`);
      } else {
        toast.success('Cost item updated successfully');
      }
    },
    onError: (error) => {
      logger.error('Error updating cost item with inventory', error);
      toast.error('Failed to update cost item');
    }
  });
};

