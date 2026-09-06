import type { WorkOrderServiceFilters } from '@/features/work-orders/types/workOrder';
import {
  COLLECTIBLE_UNPAID_INVOICE_STATUSES,
  dueDateBounds,
  type WorkOrderListAccess,
  type WorkOrderListContract,
  type WorkOrderListTeam,
} from '@/features/work-orders/utils/workOrderListContract';

/**
 * Callable filter surface for this helper. Kept off the public generic
 * constraint so PostgrestFilterBuilder's generic `eq` stays assignable.
 */
type WorkOrderFilterQuery<T> = {
  eq: (column: string, value: string) => WorkOrderFilterQuery<T> & T;
  is: (column: string, value: null) => WorkOrderFilterQuery<T> & T;
  lt: (column: string, value: string) => WorkOrderFilterQuery<T> & T;
  lte: (column: string, value: string) => WorkOrderFilterQuery<T> & T;
  gte: (column: string, value: string) => WorkOrderFilterQuery<T> & T;
  not: (column: string, operator: string, value: string) => WorkOrderFilterQuery<T> & T;
  or: (filters: string) => WorkOrderFilterQuery<T> & T;
  in: (column: string, values: readonly string[]) => WorkOrderFilterQuery<T> & T;
};

export type WorkOrderSupabaseFilterOptions = {
  /** When true, overdue filter excludes completed and cancelled statuses (dashboard list). */
  overdueExcludeTerminalStatuses?: boolean;
};

/**
 * Applies shared status / priority / assignee / due-date filters to a work_orders query.
 */
export function applyWorkOrderSupabaseFilters<T>(
  query: T,
  filters: Pick<
    WorkOrderServiceFilters,
    'status' | 'priority' | 'assigneeId' | 'dueDateFilter'
  >,
  options: WorkOrderSupabaseFilterOptions = {},
): T {
  const { overdueExcludeTerminalStatuses = false } = options;
  let next = query as T & WorkOrderFilterQuery<T>;

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

export function applyEffectiveTeamFilter<T>(query: T, team: WorkOrderListTeam): T {
  const next = query as T & WorkOrderFilterQuery<T>;

  switch (team.kind) {
    case 'all':
      return next;
    case 'unassigned':
      return next.or('and(team_id.is.null,equipment.team_id.is.null)') as T;
    case 'team':
      return next.or(
        `team_id.eq.${team.teamId},and(team_id.is.null,equipment.team_id.eq.${team.teamId})`,
      ) as T;
    default: {
      const _exhaustive: never = team;
      return _exhaustive;
    }
  }
}

export function applyWorkOrderListAccess<T>(query: T, access: WorkOrderListAccess): T {
  const next = query as T & WorkOrderFilterQuery<T>;

  switch (access.kind) {
    case 'org_admin':
      return next;
    case 'none':
      return next;
    case 'teams':
      return next.in('equipment.team_id', access.teamIds) as T;
    default: {
      const _exhaustive: never = access;
      return _exhaustive;
    }
  }
}

export function applyWorkOrderListContract<T>(
  query: T,
  contract: WorkOrderListContract,
  now: Date = new Date(),
): T {
  let next = query as T & WorkOrderFilterQuery<T>;

  next = applyWorkOrderListAccess(next, contract.access) as T & WorkOrderFilterQuery<T>;
  next = applyEffectiveTeamFilter(next, contract.team) as T & WorkOrderFilterQuery<T>;

  if (contract.status) {
    next = next.eq('status', contract.status);
  }

  if (contract.priority) {
    next = next.eq('priority', contract.priority);
  }

  switch (contract.assignee.kind) {
    case 'all':
      break;
    case 'mine':
    case 'user':
      next = next.eq('assignee_id', contract.assignee.userId);
      break;
    case 'unassigned':
      next = next.is('assignee_id', null);
      next = applyEffectiveTeamFilter(next, { kind: 'unassigned' }) as T &
        WorkOrderFilterQuery<T>;
      break;
    default: {
      const _exhaustive: never = contract.assignee;
      return _exhaustive;
    }
  }

  const bounds = dueDateBounds(contract.dueDate, now);
  if (contract.dueDate.kind === 'overdue' && bounds.endIso) {
    next = next.lt('due_date', bounds.endIso);
  } else if (contract.dueDate.kind === 'today' && bounds.startIso && bounds.endIso) {
    next = next.gte('due_date', bounds.startIso).lt('due_date', bounds.endIso);
  } else if (contract.dueDate.kind === 'this_week' && bounds.startIso && bounds.endIso) {
    next = next.gte('due_date', bounds.startIso).lte('due_date', bounds.endIso);
  }

  if (bounds.excludeTerminal) {
    next = next.not('status', 'eq', 'completed').not('status', 'eq', 'cancelled');
  }

  switch (contract.invoice.kind) {
    case 'all':
      break;
    case 'paid':
      next = next.eq('invoice_status', 'paid');
      break;
    case 'overdue':
      next = next.eq('invoice_status', 'overdue');
      break;
    case 'not_exported':
      next = next.is('quickbooks_invoice_id', null);
      break;
    case 'unpaid':
      next = next
        .not('quickbooks_invoice_id', 'is', null)
        .or(
          `invoice_status.is.null,invoice_status.in.(${[...COLLECTIBLE_UNPAID_INVOICE_STATUSES].join(',')})`,
        );
      break;
    default: {
      const _exhaustive: never = contract.invoice;
      return _exhaustive;
    }
  }

  return next;
}
