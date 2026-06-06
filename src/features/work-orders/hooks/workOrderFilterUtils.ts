import { isToday, isThisWeek } from 'date-fns';
import type { WorkOrderFilters, WorkOrderData, QuickBooksInvoiceStatus } from '@/features/work-orders/types/workOrder';
import { getPriorityValue, isOverdue } from '@/features/work-orders/utils/workOrderHelpers';
import type { QuickFilterPreset, SortDirection, SortField } from './useWorkOrderFilters';

const STATUS_ORDER: Record<string, number> = {
  submitted: 0,
  accepted: 1,
  assigned: 2,
  in_progress: 3,
  on_hold: 4,
  completed: 5,
  cancelled: 6,
};

export const DEFAULT_WORK_ORDER_FILTERS: WorkOrderFilters = {
  searchQuery: '',
  statusFilter: 'all',
  assigneeFilter: 'all',
  teamFilter: 'all',
  priorityFilter: 'all',
  dueDateFilter: 'all',
  invoiceFilter: 'all',
};

export const PRESET_FILTER_MAP: Record<QuickFilterPreset, { key: keyof WorkOrderFilters; value: string }> = {
  'my-work': { key: 'assigneeFilter', value: 'mine' },
  urgent: { key: 'priorityFilter', value: 'high' },
  overdue: { key: 'dueDateFilter', value: 'overdue' },
  unassigned: { key: 'assigneeFilter', value: 'unassigned' },
};

/**
 * Collectible invoice balances for the Work Orders "Unpaid" filter.
 * Excludes paid, voided, and unknown.
 * A NULL invoice_status with a set quickbooks_invoice_id is also treated as
 * unpaid/collectible: it represents the transitional state where a QBO invoice
 * has been exported but the hourly reconciler has not yet mirrored the status.
 */
const COLLECTIBLE_UNPAID_INVOICE_STATUSES: ReadonlySet<QuickBooksInvoiceStatus> = new Set([
  'draft',
  'sent',
  'viewed',
  'partially_paid',
  'overdue',
]);

function matchesSearch(order: WorkOrderData, searchQuery: string): boolean {
  const query = searchQuery.toLowerCase();

  return (
    order.title.toLowerCase().includes(query) ||
    Boolean(order.assigneeName?.toLowerCase().includes(query)) ||
    Boolean(order.teamName?.toLowerCase().includes(query)) ||
    Boolean(order.equipmentName?.toLowerCase().includes(query))
  );
}

function matchesAssignee(order: WorkOrderData, assigneeFilter: string, currentUserId?: string): boolean {
  return (
    assigneeFilter === 'all' ||
    (assigneeFilter === 'mine' && order.assigneeId === currentUserId) ||
    (assigneeFilter === 'unassigned' && !order.assigneeId && !order.teamId) ||
    order.assigneeId === assigneeFilter
  );
}

function matchesTeam(order: WorkOrderData, teamFilter: string): boolean {
  if (teamFilter === 'all') {
    return true;
  }

  return teamFilter === 'unassigned' ? !order.teamId : order.teamId === teamFilter;
}

function matchesDueDate(order: WorkOrderData, dueDateFilter: string): boolean {
  return (
    dueDateFilter === 'all' ||
    (dueDateFilter === 'overdue' && isOverdue(order.dueDate, order.status)) ||
    (dueDateFilter === 'today' && Boolean(order.dueDate && isToday(new Date(order.dueDate)))) ||
    (dueDateFilter === 'this_week' && Boolean(order.dueDate && isThisWeek(new Date(order.dueDate))))
  );
}

function matchesInvoice(order: WorkOrderData, invoiceFilter: string): boolean {
  const invoiceStatus = order.invoiceStatus ?? order.invoice_status ?? null;
  const hasExportedInvoice = Boolean(order.quickbooksInvoiceId ?? order.quickbooks_invoice_id);

  return (
    invoiceFilter === 'all' ||
    (invoiceFilter === 'paid' && invoiceStatus === 'paid') ||
    (invoiceFilter === 'overdue' && invoiceStatus === 'overdue') ||
    (invoiceFilter === 'not_exported' && !hasExportedInvoice) ||
    (invoiceFilter === 'unpaid' &&
      hasExportedInvoice &&
      (invoiceStatus === null || COLLECTIBLE_UNPAID_INVOICE_STATUSES.has(invoiceStatus)))
  );
}

function matchesWorkOrderFilters(
  order: WorkOrderData,
  filters: WorkOrderFilters,
  currentUserId?: string,
): boolean {
  return (
    matchesSearch(order, filters.searchQuery) &&
    (filters.statusFilter === 'all' || order.status === filters.statusFilter) &&
    matchesAssignee(order, filters.assigneeFilter, currentUserId) &&
    matchesTeam(order, filters.teamFilter) &&
    (filters.priorityFilter === 'all' || order.priority === filters.priorityFilter) &&
    matchesDueDate(order, filters.dueDateFilter) &&
    matchesInvoice(order, filters.invoiceFilter)
  );
}

export function filterWorkOrders(
  workOrders: WorkOrderData[],
  filters: WorkOrderFilters,
  currentUserId?: string,
): WorkOrderData[] {
  return workOrders.filter(order => matchesWorkOrderFilters(order, filters, currentUserId));
}

export function sortWorkOrders(
  workOrders: WorkOrderData[],
  sortField: SortField,
  sortDirection: SortDirection,
): WorkOrderData[] {
  const dir = sortDirection === 'asc' ? 1 : -1;

  return [...workOrders].sort((a, b) => {
    switch (sortField) {
      case 'due_date': {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return (aDate - bDate) * dir;
      }
      case 'priority':
        return (getPriorityValue(a.priority) - getPriorityValue(b.priority)) * dir;
      case 'status':
        return ((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)) * dir;
      case 'created':
      default: {
        const aCreated = new Date(a.createdDate || a.created_date).getTime();
        const bCreated = new Date(b.createdDate || b.created_date).getTime();
        return (aCreated - bCreated) * dir;
      }
    }
  });
}

export function countActiveWorkOrderFilters(filters: WorkOrderFilters): number {
  return [
    filters.statusFilter,
    filters.assigneeFilter,
    filters.priorityFilter,
    filters.dueDateFilter,
    filters.invoiceFilter,
  ].filter(value => value !== 'all').length;
}
