import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import type { 
  WorkOrderCost, 
  CreateWorkOrderCostData, 
  UpdateWorkOrderCostData,
  CostSummaryByUser 
} from '@/features/work-orders/types/workOrderCosts';

// Re-export types for backward compatibility
export type { WorkOrderCost, CreateWorkOrderCostData, UpdateWorkOrderCostData, CostSummaryByUser };

// Get all costs for a work order
export const getWorkOrderCosts = async (
  workOrderId: string,
  organizationId?: string
): Promise<WorkOrderCost[]> => {
  try {
    // If organization_id is provided, verify the work order belongs to that organization
    // This provides explicit multi-tenancy filtering as a failsafe (per coding guidelines)
    if (organizationId) {
      const { data: workOrder, error: workOrderError } = await supabase
        .from('work_orders')
        .select('id, organization_id')
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .single();

      if (workOrderError || !workOrder) {
        // Work order doesn't exist or doesn't belong to the specified organization
        logger.warn('Work order not found or organization mismatch', {
          workOrderId,
          organizationId,
          error: workOrderError,
        });
        return [];
      }
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
    
    let profilesMap: Record<string, string> = {};
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', creatorIds);
      
      if (profiles) {
        profilesMap = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile.name;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    return costs.map(cost => ({
      ...cost,
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
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('work_order_costs')
      .insert({
        ...costData,
        created_by: userData.user.id
      })
      .select()
      .single();

    if (error) throw error;

    // Get creator name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userData.user.id)
      .single();

    return {
      ...data,
      created_by_name: profile?.name || 'Unknown'
    };
  } catch (error) {
    logger.error('Error creating work order cost:', error);
    throw error;
  }
};

// Update a cost item
export const updateWorkOrderCost = async (
  costId: string, 
  updateData: UpdateWorkOrderCostData
): Promise<WorkOrderCost> => {
  try {
    const { data, error } = await supabase
      .from('work_order_costs')
      .update(updateData)
      .eq('id', costId)
      .select()
      .single();

    if (error) throw error;

    // Get creator name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', data.created_by)
      .single();

    return {
      ...data,
      created_by_name: profile?.name || 'Unknown'
    };
  } catch (error) {
    logger.error('Error updating work order cost:', error);
    throw error;
  }
};

// Delete a cost item
export const deleteWorkOrderCost = async (costId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('work_order_costs')
      .delete()
      .eq('id', costId);

    if (error) throw error;
  } catch (error) {
    logger.error('Error deleting work order cost:', error);
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
): Promise<{ inventory_item_id: string; quantity: number } | null> => {
  try {
    // First, fetch the cost to check for inventory link
    const cost = await getWorkOrderCostById(costId);
    
    if (!cost) {
      throw new Error('Cost item not found');
    }

    // Store inventory info before deletion
    const inventoryInfo = cost.inventory_item_id 
      ? { inventory_item_id: cost.inventory_item_id, quantity: cost.quantity }
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

    // Get creator name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', data.created_by)
      .single();

    return {
      cost: {
        ...data,
        created_by_name: profile?.name || 'Unknown'
      },
      inventoryAdjustment
    };
  } catch (error) {
    logger.error('Error updating work order cost with quantity tracking:', error);
    throw error;
  }
};

// ============================================
// Optimized Query Functions (merged from workOrderCostsOptimizedService)
// ============================================

/**
 * Get costs created by a specific user
 * Uses idx_work_order_costs_created_by index
 */
export const getMyCosts = async (organizationId: string, userId: string): Promise<WorkOrderCost[]> => {
  try {
    const { data, error } = await supabase
      .from('work_order_costs')
      .select(`
        *,
        work_orders!inner (
          id,
          title,
          organization_id
        )
      `)
      .eq('created_by', userId)
      .eq('work_orders.organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get creator names separately to avoid relation issues
    const creatorIds = [...new Set(data?.map(cost => cost.created_by) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', creatorIds);

    return (data || []).map(cost => ({
      id: cost.id,
      work_order_id: cost.work_order_id,
      description: cost.description,
      quantity: cost.quantity,
      unit_price_cents: cost.unit_price_cents,
      total_price_cents: cost.total_price_cents || (cost.quantity * cost.unit_price_cents),
      created_by: cost.created_by,
      created_at: cost.created_at,
      updated_at: cost.updated_at,
      createdByName: profiles?.find(p => p.id === cost.created_by)?.name,
      workOrderTitle: cost.work_orders?.title
    }));
  } catch (error) {
    logger.error('Error fetching user costs:', error);
    return [];
  }
};

/**
 * Get all costs for organization with creator info
 * Uses idx_work_order_costs_created_by index
 */
export const getAllCostsWithCreators = async (organizationId: string): Promise<WorkOrderCost[]> => {
  try {
    const { data, error } = await supabase
      .from('work_order_costs')
      .select(`
        *,
        work_orders!inner (
          id,
          title,
          organization_id
        )
      `)
      .eq('work_orders.organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get creator names separately
    const creatorIds = [...new Set(data?.map(cost => cost.created_by) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', creatorIds);

    return (data || []).map(cost => ({
      id: cost.id,
      work_order_id: cost.work_order_id,
      description: cost.description,
      quantity: cost.quantity,
      unit_price_cents: cost.unit_price_cents,
      total_price_cents: cost.total_price_cents || (cost.quantity * cost.unit_price_cents),
      created_by: cost.created_by,
      created_at: cost.created_at,
      updated_at: cost.updated_at,
      createdByName: profiles?.find(p => p.id === cost.created_by)?.name,
      workOrderTitle: cost.work_orders?.title
    }));
  } catch (error) {
    logger.error('Error fetching all costs:', error);
    return [];
  }
};

/**
 * Get cost summary by user for organization reports
 */
export const getCostSummaryByUser = async (organizationId: string): Promise<CostSummaryByUser[]> => {
  try {
    const { data, error } = await supabase
      .from('work_order_costs')
      .select(`
        created_by,
        quantity,
        unit_price_cents,
        total_price_cents,
        work_orders!inner (
          organization_id
        )
      `)
      .eq('work_orders.organization_id', organizationId);

    if (error) throw error;

    // Get creator names separately
    const creatorIds = [...new Set(data?.map(cost => cost.created_by) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', creatorIds);

    // Group by user and calculate totals
    const summary = (data || []).reduce((acc, cost) => {
      const userId = cost.created_by;
      const userName = profiles?.find(p => p.id === userId)?.name || 'Unknown';
      const total = cost.total_price_cents || (cost.quantity * cost.unit_price_cents);
      
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          userName,
          totalCosts: 0,
          itemCount: 0
        };
      }
      
      acc[userId].totalCosts += total;
      acc[userId].itemCount += 1;
      
      return acc;
    }, {} as Record<string, CostSummaryByUser>);

    return Object.values(summary);
  } catch (error) {
    logger.error('Error fetching cost summary:', error);
    return [];
  }
};
