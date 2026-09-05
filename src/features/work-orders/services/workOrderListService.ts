import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/utils/logger'
import { batchResolveEquipmentDisplayImageUrls } from '@/services/imageUploadService'
import { toTeamBasedWorkOrder } from '@/features/teams/services/teamBasedWorkOrderService'
import {
  buildWorkOrderListSelect,
  requiresContractEquipmentInnerJoin,
} from '@/features/work-orders/services/workOrderListQueryHelpers'
import { applyWorkOrderListContract } from '@/features/work-orders/utils/workOrderSupabaseFilters'
import { resolveWorkOrderListSearchOr } from '@/features/work-orders/utils/workOrderListSearch'
import {
  normalizeWorkOrderListPagination,
  type WorkOrderListContract,
  type WorkOrderListPagination,
  type WorkOrderListResult,
} from '@/features/work-orders/utils/workOrderListContract'

function getListSort(pagination: WorkOrderListPagination): {
  column: string
  ascending: boolean
  nullsFirst?: boolean
} {
  const ascending = pagination.sortDirection === 'asc'

  switch (pagination.sortField) {
    case 'due_date':
      return { column: 'due_date', ascending, nullsFirst: !ascending }
    case 'priority':
      return { column: 'priority', ascending }
    case 'status':
      return { column: 'status', ascending }
    case 'created':
    default:
      return { column: 'created_date', ascending }
  }
}

function getListRange(page: number, pageSize: number): { from: number; to: number } {
  const from = (page - 1) * pageSize
  return { from, to: from + pageSize - 1 }
}

type ListContractQuery<T> = {
  eq: (column: string, value: string) => T
  not: (column: string, operator: string, value: null) => T
  or: (filters: string) => T
}

function applyListContractToQuery<T>(
  query: T,
  contract: WorkOrderListContract,
  searchOr: string | null,
): T {
  let next = query as T & ListContractQuery<T>
  next = next.eq('organization_id', contract.organizationId) as T & ListContractQuery<T>
  next = next.not('equipment_id', 'is', null) as T & ListContractQuery<T>
  next = applyWorkOrderListContract(next, contract) as T & ListContractQuery<T>
  if (searchOr) {
    next = next.or(searchOr) as T & ListContractQuery<T>
  }
  return next
}

async function mapListRows(
  data: unknown[] | null,
): Promise<WorkOrderListResult['data']> {
  const rows = (data ?? []) as Array<
    Record<string, unknown> & {
      equipment_id: string
      equipment?: { image_url?: string | null }
    }
  >
  const equipmentImageUrls = await batchResolveEquipmentDisplayImageUrls(
    rows.map((row) => row.equipment?.image_url ?? null),
    { equipmentIds: rows.map((row) => row.equipment_id) },
  )
  return rows.map((row, index) => toTeamBasedWorkOrder(row, equipmentImageUrls[index]))
}

export async function getFilteredList(
  contract: WorkOrderListContract,
  pagination: Partial<WorkOrderListPagination> = {},
): Promise<WorkOrderListResult> {
  if (contract.access.kind === 'none') {
    return { data: [], count: 0 }
  }

  const normalized = normalizeWorkOrderListPagination(pagination)
  const needsInnerJoin = requiresContractEquipmentInnerJoin(contract)

  const searchOr = await resolveWorkOrderListSearchOr(contract)
  let query = applyListContractToQuery(
    supabase
      .from('work_orders')
      .select(buildWorkOrderListSelect(needsInnerJoin), { count: 'exact' }),
    contract,
    searchOr,
  )

  const sort = getListSort(normalized)
  query = query
    .order(sort.column, {
      ascending: sort.ascending,
      ...(sort.nullsFirst === undefined ? {} : { nullsFirst: sort.nullsFirst }),
    })
    .order('id', { ascending: true })

  const { from, to } = getListRange(normalized.page, normalized.pageSize)
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    logger.error('Error fetching paginated work order list:', error)
    throw error
  }

  const mapped = await mapListRows(data)
  return { data: mapped, count: count ?? mapped.length }
}

async function countMatchingContract(
  contract: WorkOrderListContract,
  errorLabel: string,
): Promise<number> {
  if (contract.access.kind === 'none') {
    return 0
  }

  const needsInnerJoin = requiresContractEquipmentInnerJoin(contract)
  const searchOr = await resolveWorkOrderListSearchOr(contract)
  const query = applyListContractToQuery(
    supabase
      .from('work_orders')
      .select(buildWorkOrderListSelect(needsInnerJoin), { count: 'exact', head: true }),
    contract,
    searchOr,
  )

  const { error, count } = await query
  if (error) {
    logger.error(errorLabel, error)
    throw error
  }

  return count ?? 0
}

export async function getAccessibleWorkOrderCount(
  contract: Pick<WorkOrderListContract, 'organizationId' | 'access' | 'team'>,
): Promise<number> {
  return countMatchingContract(
    {
      organizationId: contract.organizationId,
      search: undefined,
      status: undefined,
      priority: undefined,
      assignee: { kind: 'all' },
      team: contract.team,
      dueDate: { kind: 'all' },
      invoice: { kind: 'all' },
      access: contract.access,
    },
    'Error counting accessible work orders:',
  )
}

export async function getUnassignedSubmittedCount(
  contract: Pick<WorkOrderListContract, 'organizationId' | 'access'>,
): Promise<number> {
  return countMatchingContract(
    {
      organizationId: contract.organizationId,
      search: undefined,
      status: 'submitted',
      priority: undefined,
      assignee: { kind: 'unassigned' },
      team: { kind: 'all' },
      dueDate: { kind: 'all' },
      invoice: { kind: 'all' },
      access: contract.access,
    },
    'Error counting unassigned submitted work orders:',
  )
}
