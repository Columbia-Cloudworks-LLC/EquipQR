import type { WorkOrderCost } from '@/features/work-orders/types/workOrderCosts';

type CostRowWithWorkOrderTitle = {
  id: string;
  work_order_id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  work_orders?: { title?: string | null } | null;
};

export function resolveWorkOrderCostTotalCents(cost: {
  total_price_cents: number | null;
  quantity: number;
  unit_price_cents: number;
}): number {
  return cost.total_price_cents ?? cost.quantity * cost.unit_price_cents;
}

export function mapCostRowsToWorkOrderCosts(
  rows: CostRowWithWorkOrderTitle[],
  profilesMap: Record<string, string>,
): WorkOrderCost[] {
  return rows.map((cost) => ({
    id: cost.id,
    work_order_id: cost.work_order_id,
    description: cost.description,
    quantity: cost.quantity,
    unit_price_cents: cost.unit_price_cents,
    total_price_cents: resolveWorkOrderCostTotalCents(cost),
    created_by: cost.created_by,
    created_at: cost.created_at,
    updated_at: cost.updated_at,
    createdByName: profilesMap[cost.created_by],
    workOrderTitle: cost.work_orders?.title ?? undefined,
  }));
}
