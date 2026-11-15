import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { requireAuthUserIdFromClaims } from '@/lib/authClaims';
import {
  fetchCreatorName,
  fetchCreatorNameMap,
} from '@/features/work-orders/services/workOrderCostProfileHelpers';
import { resolveWorkOrderCostTotalCents } from '@/features/work-orders/services/workOrderCostListHelpers';
import { verifyWorkOrderOrganizationScope } from '@/features/work-orders/services/workOrderOrganizationGate';
import type { 
  WorkOrderCost, 
  CreateWorkOrderCostData, 
  UpdateWorkOrderCostData
} from '@/features/work-orders/types/workOrderCosts';

// Re-export types for backward compatibility
export type { WorkOrderCost, CreateWorkOrderCostData, UpdateWorkOrderCostData };

// Get all costs for a work order
export const getWorkOrderCosts = async (
  workOrderId: string,
  organizationId?: string
): Promise<WorkOrderCost[]> => {
  try {
    // If organization_id is provided, verify the work order belongs to that organization
    // This provides explicit multi-tenancy filtering as a failsafe (per coding guidelines)
    if (
      organizationId &&
      !(await verifyWorkOrderOrganizationScope(workOrderId, organizationId))
    ) {
      return [];
    }

    // Get costs (RLS policies also enforce multi-tenancy)
    const { data, error } = await supabase
      .from('work_order_costs')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Get creator names separately to avoid join issues
    const costs = data || [];
    const creatorIds = [...new Set(costs.map(cost => cost.created_by))];
    
    const profilesMap = await fetchCreatorNameMap(creatorIds);

    return costs.map(cost => ({
      ...cost,
      total_price_cents: resolveWorkOrderCostTotalCents(cost),
      created_by_name: profilesMap[cost.created_by] || 'Unknown'
    }));
  } catch (error) {
    logger.error('Error fetching work order costs:', error);
    throw error;
  }
};

// Create a new cost item
export const createWorkOrderCost = async (costData: CreateWorkOrderCostData): Promise<WorkOrderCost> => {
  try {
    const userId = await requireAuthUserIdFromClaims();

    const { data, error } = await supabase
      .from('work_order_costs')
      .insert({
        ...costData,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      total_price_cents: resolveWorkOrderCostTotalCents(data),
      created_by_name: await fetchCreatorName(userId),
    };
  } catch (error) {
    logger.error('Error creating work order cost:', error);
    throw error;
  }
};

/**
 * Get a single cost by ID.
 * Used to check for inventory_item_id before deletion.
 */
export const getWorkOrderCostById = async (costId: string): Promise<WorkOrderCost | null> => {
  try {
    const { data, error } = await supabase
      .from('work_order_costs')
      .select('*')
      .eq('id', costId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }

    return data as WorkOrderCost;
  } catch (error) {
    logger.error('Error fetching work order cost by ID:', error);
    throw error;
  }
};

/**
 * Delete a cost item and optionally restore inventory.
 * Returns the deleted cost's inventory info for the caller to handle restoration.
 * 
 * @param costId - The cost item ID to delete
 * @returns Object with inventory_item_id and quantity if cost was from inventory, null otherwise
 */
export const deleteWorkOrderCostWithInventoryInfo = async (
  costId: string
): Promise<{ inventory_item_id: string; quantity: number; work_order_id: string } | null> => {
  try {
    // First, fetch the cost to check for inventory link
    const cost = await getWorkOrderCostById(costId);

    if (!cost) {
      throw new Error('Cost item not found');
    }

    // Store inventory info before deletion. work_order_id is forwarded so the
    // restore adjustment stays work-order-scoped (required for Parts
    // Consumers, who may only adjust inventory through work orders).
    const inventoryInfo = cost.inventory_item_id
      ? {
          inventory_item_id: cost.inventory_item_id,
          quantity: cost.quantity,
          work_order_id: cost.work_order_id,
        }
      : null;

    // Delete the cost
    const { error } = await supabase
      .from('work_order_costs')
      .delete()
      .eq('id', costId);

    if (error) throw error;

    // Return inventory info so caller can handle restoration
    return inventoryInfo;
  } catch (error) {
    logger.error('Error deleting work order cost with inventory info:', error);
    throw error;
  }
};

/**
 * Update a cost item and return old/new quantity info for inventory adjustment.
 * Used when updating quantity of an inventory-sourced cost.
 * 
 * @param costId - The cost item ID to update
 * @param updateData - Fields to update
 * @returns The updated cost and quantity delta info if applicable
 */
export const updateWorkOrderCostWithQuantityTracking = async (
  costId: string,
  updateData: UpdateWorkOrderCostData
): Promise<{ 
  cost: WorkOrderCost; 
  inventoryAdjustment: { inventory_item_id: string; delta: number } | null 
}> => {
  try {
    // Fetch current cost to get original values and inventory link
    const currentCost = await getWorkOrderCostById(costId);
    
    if (!currentCost) {
      throw new Error('Cost item not found');
    }

    // Calculate quantity delta if this is an inventory-sourced cost and quantity is changing
    let inventoryAdjustment: { inventory_item_id: string; delta: number } | null = null;
    
    if (
      currentCost.inventory_item_id && 
      updateData.quantity !== undefined && 
      updateData.quantity !== currentCost.quantity
    ) {
      // Delta: positive means returning to inventory, negative means taking more
      // If current=3 and new=2, delta=1 (returning 1 to inventory)
      // If current=2 and new=3, delta=-1 (taking 1 more from inventory)
      const delta = currentCost.quantity - updateData.quantity;
      inventoryAdjustment = {
        inventory_item_id: currentCost.inventory_item_id,
        delta
      };
    }

    // Perform the update
    const { data, error } = await supabase
      .from('work_order_costs')
      .update(updateData)
      .eq('id', costId)
      .select()
      .single();

    if (error) throw error;

    return {
      cost: {
        ...data,
        total_price_cents: resolveWorkOrderCostTotalCents(data),
        created_by_name: await fetchCreatorName(data.created_by),
      },
      inventoryAdjustment
    };
  } catch (error) {
    logger.error('Error updating work order cost with quantity tracking:', error);
    throw error;
  }
};
