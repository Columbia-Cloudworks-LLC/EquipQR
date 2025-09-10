/**
 * Work Order Costs domain types
 * Consolidated from multiple cost-related interfaces
 */

import { AuditableEntity } from '@/shared/types/common';

/**
 * Work Order Cost entity
 */
export interface WorkOrderCost extends AuditableEntity {
  work_order_id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  
  // Computed fields
  unit_price_dollars?: number;
  total_price_dollars?: number;
}

/**
 * Work Order Cost creation data
 */
export interface CreateWorkOrderCostData {
  work_order_id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
}

/**
 * Work Order Cost update data
 */
export interface UpdateWorkOrderCostData {
  description?: string;
  quantity?: number;
  unit_price_cents?: number;
}

/**
 * Work Order Cost item for forms (includes temporary fields)
 */
export interface WorkOrderCostItem extends Omit<WorkOrderCost, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'created_by_name'> {
  id: string;
  isNew?: boolean;
  isDeleted?: boolean;
  isModified?: boolean;
}

/**
 * Work Order Cost summary
 */
export interface WorkOrderCostSummary {
  total_items: number;
  total_cost_cents: number;
  total_cost_dollars: number;
  average_item_cost_cents: number;
  average_item_cost_dollars: number;
  by_creator: Array<{
    creator_id: string;
    creator_name: string;
    item_count: number;
    total_cost_cents: number;
  }>;
}

/**
 * Work Order Cost filters
 */
export interface WorkOrderCostFilters {
  work_order_id?: string;
  created_by?: string;
  date_range?: {
    start: string;
    end: string;
  };
  min_amount_cents?: number;
  max_amount_cents?: number;
  search?: string;
}

/**
 * Work Order Cost bulk operations
 */
export interface WorkOrderCostBulkUpdateData {
  cost_ids: string[];
  updates: Partial<UpdateWorkOrderCostData>;
  updated_by: string;
}

/**
 * Work Order Cost import data
 */
export interface WorkOrderCostImportData {
  work_order_id: string;
  costs: Omit<CreateWorkOrderCostData, 'work_order_id'>[];
  imported_by: string;
  import_source?: string;
}
