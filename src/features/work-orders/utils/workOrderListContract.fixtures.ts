import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context'
import type { WorkOrderData, WorkOrderFilters } from '@/features/work-orders/types/workOrder'
import { DEFAULT_WORK_ORDER_FILTERS } from '@/features/work-orders/hooks/workOrderFilterUtils'
import type { WorkOrderListParseInput } from '@/features/work-orders/utils/workOrderListContract'

export const LIST_CONTRACT_NOW = new Date('2026-09-02T15:00:00.000Z')

export function listContractWorkOrder(
  overrides: Partial<WorkOrderData> = {},
): WorkOrderData {
  return {
    id: 'wo-base',
    title: 'Base Work Order',
    description: '',
    equipmentId: 'eq-1',
    organizationId: 'org-1',
    status: 'submitted',
    priority: 'medium',
    createdDate: '2026-01-01T00:00:00Z',
    created_date: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function parseInput(
  overrides: Partial<WorkOrderListParseInput> & { filters?: Partial<WorkOrderFilters> } = {},
): WorkOrderListParseInput {
  const { filters, ...rest } = overrides
  return {
    organizationId: 'org-1',
    filters: { ...DEFAULT_WORK_ORDER_FILTERS, ...filters },
    selectedTeamId: null,
    currentUserId: 'user-1',
    isOrgAdmin: true,
    userTeamIds: ['team-access'],
    ...rest,
  }
}

export const LIST_CONTRACT_FIXTURES = {
  mine: listContractWorkOrder({
    id: 'wo-mine',
    title: 'Mine',
    assigneeId: 'user-1',
    assigneeName: 'Dave',
  }),
  others: listContractWorkOrder({
    id: 'wo-others',
    title: 'Others',
    assigneeId: 'user-2',
    assigneeName: 'Eve',
  }),
  unassignedNoTeam: listContractWorkOrder({
    id: 'wo-unassigned-no-team',
    title: 'Unassigned lone',
    assigneeId: undefined,
    teamId: undefined,
  }),
  unassignedWithTeam: listContractWorkOrder({
    id: 'wo-unassigned-with-team',
    title: 'Unassigned on team',
    assigneeId: undefined,
    teamId: 'team-effective',
  }),
  sundayThisWeek: listContractWorkOrder({
    id: 'wo-sunday-week',
    title: 'Sunday-week due',
    assigneeId: 'user-2',
    teamId: 'team-other',
    dueDate: '2026-08-30T12:00:00.000Z',
  }),
  previousSaturday: listContractWorkOrder({
    id: 'wo-prev-saturday',
    title: 'Previous Saturday due',
    assigneeId: 'user-2',
    teamId: 'team-other',
    dueDate: '2026-08-29T12:00:00.000Z',
  }),
  invoiceUnpaidNull: listContractWorkOrder({
    id: 'wo-unpaid-null',
    title: 'Exported null status',
    assigneeId: 'user-2',
    teamId: 'team-other',
    quickbooksInvoiceId: 'inv-pending',
    invoiceStatus: null,
  }),
  invoiceUnpaidDraft: listContractWorkOrder({
    id: 'wo-unpaid-draft',
    title: 'Draft invoice',
    assigneeId: 'user-2',
    teamId: 'team-other',
    quickbooksInvoiceId: 'inv-draft',
    invoiceStatus: 'draft',
  }),
  invoicePaid: listContractWorkOrder({
    id: 'wo-paid',
    title: 'Paid invoice',
    assigneeId: 'user-2',
    teamId: 'team-other',
    quickbooksInvoiceId: 'inv-paid',
    invoiceStatus: 'paid',
  }),
  invoiceNotExported: listContractWorkOrder({
    id: 'wo-not-exported',
    title: 'Not exported',
    assigneeId: 'user-2',
    teamId: 'team-other',
    quickbooksInvoiceId: null,
    invoiceStatus: null,
  }),
  searchEquipmentTeam: listContractWorkOrder({
    id: 'wo-search-team',
    title: 'Pump PM',
    assigneeId: 'user-2',
    teamId: 'team-other',
    teamName: 'North Yard Crew',
    equipmentName: 'Pump 12',
  }),
  coalesceWorkOrderTeam: listContractWorkOrder({
    id: 'wo-coalesce-wo-team',
    title: 'WO team wins',
    teamId: 'team-topbar',
    equipmentTeamId: 'team-equipment',
  }),
  coalesceEquipmentTeam: listContractWorkOrder({
    id: 'wo-coalesce-eq-team',
    title: 'Equipment team fallback',
    teamId: 'team-topbar',
    equipmentTeamId: 'team-topbar',
  }),
  otherEffectiveTeam: listContractWorkOrder({
    id: 'wo-other-effective',
    title: 'Other effective team',
    teamId: 'team-other',
    equipmentTeamId: 'team-topbar',
  }),
} as const

export const ALL_LIST_CONTRACT_FIXTURES = Object.values(LIST_CONTRACT_FIXTURES)

export { UNASSIGNED_TEAM_ID }
