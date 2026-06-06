import type { WorkOrderServiceFilters } from '@/features/work-orders/types/workOrder';

/** Minimal PostgREST filter builder surface used by work-order list queries. */
export type WorkOrderFilterQuery<T> = {
  eq: (column: string, value: unknown) => T;
  is: (column: string, value: null) => T;
  lt: (column: string, value: string) => T;
  gte: (column: string, value: string) => T;
  not: (column: string, operator: string, value: string) => T;
};

export type WorkOrderSupabaseFilterOptions = {
  /** When true, overdue filter excludes completed and cancelled statuses (dashboard list). */
  overdueExcludeTerminalStatuses?: boolean;
};

/**
 * Applies shared status / priority / assignee / due-date filters to a work_orders query.
 */
export function applyWorkOrderSupabaseFilters<T extends WorkOrderFilterQuery<T>>(
  query: T,
  filters: Pick<
    WorkOrderServiceFilters,
    'status' | 'priority' | 'assigneeId' | 'dueDateFilter'
  >,
  options: WorkOrderSupabaseFilterOptions = {},
): T {
  const { overdueExcludeTerminalStatuses = false } = options;
  let next = query;

  if (filters.status && filters.status !== 'all') {
    next = next.eq('status', filters.status);
  }

  if (filters.priority && filters.priority !== 'all') {
    next = next.eq('priority', filters.priority);
  }

  if (filters.assigneeId && filters.assigneeId !== 'all') {
    if (filters.assigneeId === 'unassigned') {
      next = next.is('assignee_id', null);
    } else {
      next = next.eq('assignee_id', filters.assigneeId);
    }
  }

  if (filters.dueDateFilter) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    switch (filters.dueDateFilter) {
      case 'overdue': {
        next = next.lt('due_date', today.toISOString());
        if (overdueExcludeTerminalStatuses) {
          next = next
            .not('status', 'eq', 'completed')
            .not('status', 'eq', 'cancelled');
        }
        break;
      }
      case 'today': {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        next = next
          .gte('due_date', today.toISOString())
          .lt('due_date', tomorrow.toISOString());
        break;
      }
      case 'this_week':
        next = next
          .gte('due_date', today.toISOString())
          .lt('due_date', weekFromNow.toISOString());
        break;
    }
  }

  return next;
}
