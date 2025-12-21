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
export const getWorkOrderCosts = async (workOrderId: string): Promise<WorkOrderCost[]> => {
  try {
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
