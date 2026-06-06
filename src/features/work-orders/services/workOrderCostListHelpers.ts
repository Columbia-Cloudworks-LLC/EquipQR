import { fetchCreatorNameMap } from '@/features/work-orders/services/workOrderCostProfileHelpers';
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
    total_price_cents: cost.total_price_cents || cost.quantity * cost.unit_price_cents,
    created_by: cost.created_by,
    created_at: cost.created_at,
    updated_at: cost.updated_at,
    createdByName: profilesMap[cost.created_by],
    workOrderTitle: cost.work_orders?.title,
  }));
}

export async function mapCostsWithCreatorProfiles(
  rows: CostRowWithWorkOrderTitle[] | null | undefined,
): Promise<WorkOrderCost[]> {
  const list = rows ?? [];
  const creatorIds = [...new Set(list.map((cost) => cost.created_by))];
  const profilesMap = await fetchCreatorNameMap(creatorIds);
  return mapCostRowsToWorkOrderCosts(list, profilesMap);
}
