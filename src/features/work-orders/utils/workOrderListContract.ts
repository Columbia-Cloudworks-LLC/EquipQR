import { addDays, endOfWeek, startOfDay, startOfWeek } from 'date-fns'
import { UNASSIGNED_TEAM_ID, type SelectedTeamId } from '@/contexts/selected-team-context'
import { filterWorkOrders } from '@/features/work-orders/hooks/workOrderFilterUtils'
import type {
  QuickBooksInvoiceStatus,
  WorkOrder,
  WorkOrderData,
  WorkOrderFilters,
  WorkOrderPriority,
  WorkOrderStatus,
} from '@/features/work-orders/types/workOrder'
import type { SortDirection, SortField } from '@/features/work-orders/hooks/useWorkOrderFilters'
import {
  DEFAULT_WORK_ORDER_CARD_PAGE_SIZE,
  MAX_LIST_PAGE_SIZE,
} from '@/features/work-orders/utils/workOrderListPagination'

export type TeamBasedWorkOrder = WorkOrder & {
  equipmentId?: string
  organizationId?: string
  assigneeId?: string | null
  teamId?: string | null
  createdDate?: string
  dueDate?: string | null
  estimatedHours?: number | null
  completedDate?: string | null
}

export type WorkOrderListAccess =
  | { kind: 'org_admin' }
  | { kind: 'teams'; teamIds: readonly string[] }
  | { kind: 'none' }

export type WorkOrderListAssignee =
  | { kind: 'all' }
  | { kind: 'mine'; userId: string }
  | { kind: 'unassigned' }
  | { kind: 'user'; userId: string }

export type WorkOrderListTeam =
  | { kind: 'all' }
  | { kind: 'unassigned' }
  | { kind: 'team'; teamId: string }

export type WorkOrderListDueDate =
  | { kind: 'all' }
  | { kind: 'overdue' }
  | { kind: 'today' }
  | { kind: 'this_week' }

export type WorkOrderListInvoice =
  | { kind: 'all' }
  | { kind: 'paid' }
  | { kind: 'overdue' }
  | { kind: 'not_exported' }
  | { kind: 'unpaid' }

export type WorkOrderListContract = {
  organizationId: string
  search: string | undefined
  status: WorkOrderStatus | undefined
  priority: WorkOrderPriority | undefined
  assignee: WorkOrderListAssignee
  team: WorkOrderListTeam
  dueDate: WorkOrderListDueDate
  invoice: WorkOrderListInvoice
  access: WorkOrderListAccess
}

export type WorkOrderListPagination = {
  page: number
  pageSize: number
  sortField: SortField
  sortDirection: SortDirection
}

export type WorkOrderListResult = {
  data: TeamBasedWorkOrder[]
  count: number
}

export type WorkOrderPagedListKeySpec = {
  contract: WorkOrderListContract
  pagination: WorkOrderListPagination
}

export type WorkOrderListParseInput = {
  organizationId: string
  filters: WorkOrderFilters
  selectedTeamId: SelectedTeamId
  currentUserId: string | undefined
  isOrgAdmin: boolean
  userTeamIds: readonly string[]
}

const WORK_ORDER_STATUSES: ReadonlySet<WorkOrderStatus> = new Set([
  'submitted',
  'accepted',
  'assigned',
  'in_progress',
  'on_hold',
  'completed',
  'cancelled',
])

const WORK_ORDER_PRIORITIES: ReadonlySet<WorkOrderPriority> = new Set([
  'low',
  'medium',
  'high',
])

const DUE_DATE_KINDS: ReadonlySet<WorkOrderListDueDate['kind']> = new Set([
  'overdue',
  'today',
  'this_week',
])

const INVOICE_KINDS: ReadonlySet<WorkOrderListInvoice['kind']> = new Set([
  'paid',
  'overdue',
  'not_exported',
  'unpaid',
])

export const COLLECTIBLE_UNPAID_INVOICE_STATUSES: ReadonlySet<QuickBooksInvoiceStatus> = new Set([
  'draft',
  'sent',
  'viewed',
  'partially_paid',
  'overdue',
])

function parseStatus(value: string): WorkOrderStatus | undefined {
  return WORK_ORDER_STATUSES.has(value as WorkOrderStatus)
    ? (value as WorkOrderStatus)
    : undefined
}

function parsePriority(value: string): WorkOrderPriority | undefined {
  return WORK_ORDER_PRIORITIES.has(value as WorkOrderPriority)
    ? (value as WorkOrderPriority)
    : undefined
}

function parseAssignee(
  value: string,
  currentUserId: string | undefined,
): WorkOrderListAssignee {
  if (value === 'all' || value === '') {
    return { kind: 'all' }
  }
  if (value === 'mine') {
    return currentUserId ? { kind: 'mine', userId: currentUserId } : { kind: 'all' }
  }
  if (value === 'unassigned') {
    return { kind: 'unassigned' }
  }
  return { kind: 'user', userId: value }
}

function parseTeam(selectedTeamId: SelectedTeamId): WorkOrderListTeam {
  if (selectedTeamId === null) {
    return { kind: 'all' }
  }
  if (selectedTeamId === UNASSIGNED_TEAM_ID) {
    return { kind: 'unassigned' }
  }
  return { kind: 'team', teamId: selectedTeamId }
}

function parseDueDate(value: string): WorkOrderListDueDate {
  return DUE_DATE_KINDS.has(value as WorkOrderListDueDate['kind'])
    ? { kind: value as WorkOrderListDueDate['kind'] }
    : { kind: 'all' }
}

function parseInvoice(value: string): WorkOrderListInvoice {
  return INVOICE_KINDS.has(value as WorkOrderListInvoice['kind'])
    ? { kind: value as WorkOrderListInvoice['kind'] }
    : { kind: 'all' }
}

function parseAccess(
  isOrgAdmin: boolean,
  userTeamIds: readonly string[],
): WorkOrderListAccess {
  if (isOrgAdmin) {
    return { kind: 'org_admin' }
  }
  if (userTeamIds.length === 0) {
    return { kind: 'none' }
  }
  return { kind: 'teams', teamIds: userTeamIds }
}

export function parseWorkOrderListContract(input: WorkOrderListParseInput): WorkOrderListContract {
  const search = input.filters.searchQuery.trim()

  return {
    organizationId: input.organizationId,
    search: search.length > 0 ? search : undefined,
    status: parseStatus(input.filters.statusFilter),
    priority: parsePriority(input.filters.priorityFilter),
    assignee: parseAssignee(input.filters.assigneeFilter, input.currentUserId),
    team: parseTeam(input.selectedTeamId),
    dueDate: parseDueDate(input.filters.dueDateFilter),
    invoice: parseInvoice(input.filters.invoiceFilter),
    access: parseAccess(input.isOrgAdmin, input.userTeamIds),
  }
}

export function dueDateBounds(
  dueDate: WorkOrderListDueDate,
  now: Date,
): { startIso?: string; endIso?: string; excludeTerminal: boolean } {
  switch (dueDate.kind) {
    case 'all':
      return { excludeTerminal: false }
    case 'overdue':
      return { endIso: now.toISOString(), excludeTerminal: true }
    case 'today': {
      const start = startOfDay(now)
      return {
        startIso: start.toISOString(),
        endIso: addDays(start, 1).toISOString(),
        excludeTerminal: false,
      }
    }
    case 'this_week':
      return {
        startIso: startOfWeek(now, { weekStartsOn: 0 }).toISOString(),
        endIso: endOfWeek(now, { weekStartsOn: 0 }).toISOString(),
        excludeTerminal: false,
      }
    default: {
      const _exhaustive: never = dueDate
      return _exhaustive
    }
  }
}

function filtersFromListContract(contract: WorkOrderListContract): {
  filters: WorkOrderFilters
  currentUserId?: string
} {
  const assigneeFilter =
    contract.assignee.kind === 'all'
      ? 'all'
      : contract.assignee.kind === 'unassigned'
        ? 'unassigned'
        : contract.assignee.kind === 'mine'
          ? 'mine'
          : contract.assignee.userId

  const teamFilter =
    contract.team.kind === 'all'
      ? 'all'
      : contract.team.kind === 'unassigned'
        ? 'unassigned'
        : contract.team.teamId

  return {
    filters: {
      searchQuery: contract.search ?? '',
      statusFilter: contract.status ?? 'all',
      assigneeFilter,
      teamFilter,
      priorityFilter: contract.priority ?? 'all',
      dueDateFilter: contract.dueDate.kind === 'all' ? 'all' : contract.dueDate.kind,
      invoiceFilter: contract.invoice.kind === 'all' ? 'all' : contract.invoice.kind,
    },
    currentUserId:
      contract.assignee.kind === 'mine' || contract.assignee.kind === 'user'
        ? contract.assignee.userId
        : undefined,
  }
}

export function matchesWorkOrderListContract(
  order: WorkOrderData,
  contract: WorkOrderListContract,
): boolean {
  const { filters, currentUserId } = filtersFromListContract(contract)
  return filterWorkOrders([order], filters, currentUserId).length === 1
}

export function normalizeWorkOrderListPagination(
  pagination: Partial<WorkOrderListPagination>,
): WorkOrderListPagination {
  return {
    page: Math.max(1, pagination.page ?? 1),
    pageSize: Math.min(
      MAX_LIST_PAGE_SIZE,
      Math.max(1, pagination.pageSize ?? DEFAULT_WORK_ORDER_CARD_PAGE_SIZE),
    ),
    sortField: pagination.sortField ?? 'created',
    sortDirection: pagination.sortDirection ?? 'desc',
  }
}
