import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import { isOverdue } from '@/features/work-orders/utils/workOrderHelpers';

const PRIORITY_WEIGHT: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Stable sort for dashboard mobile snapshots: overdue open work first, then priority, then recency.
 */
export function prioritizeWorkOrdersForDashboard(workOrders: WorkOrder[], limit = 5): WorkOrder[] {
  const scored = workOrders.map((wo, index) => {
    const overdue = isOverdue(wo.due_date, wo.status);
    const pri = PRIORITY_WEIGHT[wo.priority] ?? 0;
    const created = wo.created_date ? new Date(wo.created_date).getTime() : 0;
    return { wo, overdue, pri, created, index };
  });

  scored.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (b.pri !== a.pri) return b.pri - a.pri;
    if (b.created !== a.created) return b.created - a.created;
    return a.index - b.index;
  });

  return scored.slice(0, limit).map((s) => s.wo);
}
