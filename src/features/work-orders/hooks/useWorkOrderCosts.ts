
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import {
  getWorkOrderCosts,
  createWorkOrderCost,
  updateWorkOrderCost,
  deleteWorkOrderCost,
  deleteWorkOrderCostWithInventoryInfo,
  updateWorkOrderCostWithQuantityTracking,
  getWorkOrderCostById,
  type UpdateWorkOrderCostData
} from '@/features/work-orders/services/workOrderCostsService';
import { adjustInventoryQuantity } from '@/features/inventory/services/inventoryService';

export const useWorkOrderCosts = (workOrderId: string) => {
  return useQuery({
    queryKey: ['work-order-costs', workOrderId],
    queryFn: () => getWorkOrderCosts(workOrderId),
    enabled: !!workOrderId
  });
};

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

export const useUpdateWorkOrderCost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ costId, updateData }: { costId: string; updateData: UpdateWorkOrderCostData }) =>
      updateWorkOrderCost(costId, updateData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-costs', data.work_order_id] });
      toast.success('Cost item updated successfully');
    },
    onError: (error) => {
      logger.error('Error updating cost item', error);
      toast.error('Failed to update cost item');
    }
  });
};

export const useDeleteWorkOrderCost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWorkOrderCost,
    onSuccess: () => {
      // We need to invalidate all cost queries since we don't have the work order ID in the response
      queryClient.invalidateQueries({ queryKey: ['work-order-costs'] });
      toast.success('Cost item deleted successfully');
    },
    onError: (error) => {
      logger.error('Error deleting cost item', error);
      toast.error('Failed to delete cost item');
    }
  });
};

/**
 * Delete a cost item with inventory restoration.
 * If the cost was created from inventory, restores the quantity back to the source inventory item.
 */
export const useDeleteWorkOrderCostWithInventoryRestore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      costId, 
      organizationId 
    }: { 
      costId: string; 
      organizationId: string;
    }) => {
      // Delete the cost and get inventory info if applicable
      const inventoryInfo = await deleteWorkOrderCostWithInventoryInfo(costId);

      // If this cost was from inventory, restore the quantity
      if (inventoryInfo) {
        await adjustInventoryQuantity(organizationId, {
          itemId: inventoryInfo.inventory_item_id,
          delta: inventoryInfo.quantity, // Positive to add back to inventory
          reason: 'Restored from deleted work order cost'
        });
      }

      return { inventoryRestored: !!inventoryInfo, quantity: inventoryInfo?.quantity ?? 0 };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-costs'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      
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
            : 'Used in work order cost quantity increase'
        });
      }

      return { 
        cost: result.cost, 
        inventoryAdjusted: !!result.inventoryAdjustment,
        delta: result.inventoryAdjustment?.delta ?? 0
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-costs', result.cost.work_order_id] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      
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

/**
 * Get a single cost by ID (for checking inventory_item_id before deletion)
 */
export const useWorkOrderCostById = (costId: string | undefined) => {
  return useQuery({
    queryKey: ['work-order-cost', costId],
    queryFn: () => costId ? getWorkOrderCostById(costId) : null,
    enabled: !!costId
  });
};

