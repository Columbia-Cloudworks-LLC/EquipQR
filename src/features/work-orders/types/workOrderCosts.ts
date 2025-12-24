/**
 * Work Order Cost Types - Consolidated type definitions
 * 
 * This file serves as the single source of truth for work order cost types.
 * Import from here instead of defining types locally in components/hooks.
 */

// ============================================
// Core Cost Types
// ============================================

/**
 * Work order cost item (database format)
 * Primary type for cost data
 */
export interface WorkOrderCost {
  id: string;
  work_order_id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Computed fields from joins
  created_by_name?: string;
  createdByName?: string;
  workOrderTitle?: string;
}

/**
 * @deprecated Use WorkOrderCost instead
 * Legacy type alias for backward compatibility
 */
export interface WorkOrderCostItem {
  id: string;
  work_order_id: string;
  type: 'labor' | 'parts' | 'other';
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// Create/Update Data Types
// ============================================

export interface CreateWorkOrderCostData {
  work_order_id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
}

export interface UpdateWorkOrderCostData {
  description?: string;
  quantity?: number;
  unit_price_cents?: number;
}

/**
 * @deprecated Use UpdateWorkOrderCostData instead
 */
export interface WorkOrderCostUpdateData {
  description?: string;
  quantity?: number;
  unit_cost?: number;
  type?: 'labor' | 'parts' | 'other';
}

// ============================================
// Cost Summary Types
// ============================================

export interface CostSummaryByUser {
  userId: string;
  userName: string;
  totalCosts: number;
  itemCount: number;
}

