import type { WorkOrder } from '@/features/work-orders/types/workOrder';

const PRIORITY_WEIGHT: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function isOpenStatus(status: string): boolean {
  return status !== 'completed' && status !== 'cancelled';
}

function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate || !isOpenStatus(status)) return false;
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < startOfTodayMs();
}

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
