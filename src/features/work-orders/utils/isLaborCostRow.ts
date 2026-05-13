import type { WorkOrderCost } from '@/features/work-orders/services/workOrderCostsService';

/** Manual labor lines use description "Labor" or "Labor - …" with no inventory link. */
export function isLaborCostRow(cost: Pick<WorkOrderCost, 'description' | 'inventory_item_id'>): boolean {
  return !cost.inventory_item_id && /^Labor(\s|$|-)/i.test(cost.description.trim());
}
