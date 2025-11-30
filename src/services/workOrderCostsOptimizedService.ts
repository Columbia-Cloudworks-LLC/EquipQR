/**
 * @deprecated This file is deprecated. Import from canonical services instead:
 * - Types: import from '@/types/workOrderCosts'
 * - Functions: import from '@/services/workOrderCostsService'
 * 
 * This file re-exports from the canonical locations for backward compatibility.
 */

// Re-export types from canonical location
export type { WorkOrderCost, CostSummaryByUser } from '@/types/workOrderCosts';

// Re-export functions from canonical service
export {
  getMyCosts,
  getAllCostsWithCreators,
  getCostSummaryByUser
} from './workOrderCostsService';