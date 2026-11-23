import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useUser } from '@/contexts/useUser'
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context'
import { useSelectedTeam } from '@/hooks/useSelectedTeam'
import { useTeamBasedAccess } from '@/features/teams/hooks/useTeamBasedWorkOrders'
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext'
import { useAuth } from '@/hooks/useAuth'
import { useEquipmentSummaries } from '@/features/equipment/hooks/useEquipment'
import { workOrders } from '@/lib/queryKeys'
import { buildOfflineQueuedWorkOrder } from '@/features/work-orders/utils/buildOfflineQueuedWorkOrder'
import {
  countActiveWorkOrderFilters,
  DEFAULT_WORK_ORDER_FILTERS,
  filterWorkOrders,
  nextPresetsAfterFilterChange,
  PRESET_FILTER_MAP,
} from '@/features/work-orders/hooks/workOrderFilterUtils'
import {
  getAccessibleWorkOrderCount,
  getUnassignedSubmittedCount,
} from '@/features/work-orders/services/workOrderListService'
import { useWorkOrderList } from '@/features/work-orders/hooks/useWorkOrderList'
import {
  parseWorkOrderListContract,
  type TeamBasedWorkOrder,
} from '@/features/work-orders/utils/workOrderListContract'
import {
  DEFAULT_WORK_ORDER_CARD_PAGE_SIZE,
  WORK_ORDER_CARD_PAGE_SIZE_OPTIONS,
} from '@/features/work-orders/utils/workOrderListPagination'
import type { WorkOrderFilters } from '@/features/work-orders/types/workOrder'
import type { OfflineQueueCreateItem } from '@/services/offlineQueueService'
import {
  offlineSavedKeys,
  pageOf,
  shouldUseSavedList,
  useOfflineSavedList,
} from '@/features/offline-queue/utils/offlineSavedData'
import { teamAccessQueryScope } from '@/features/teams/utils/teamAccessScope'
import type { QuickFilterPreset, SortDirection, SortField } from '@/features/work-orders/hooks/useWorkOrderFilters'

const PRIORITY_RANK: Record<string, number> = { low: 1, medium: 2, high: 3 }

function offlineSortValue(order: TeamBasedWorkOrder, field: SortField): string | number | null {
  switch (field) {
    case 'due_date':
      return order.due_date ?? order.dueDate ?? null
    case 'priority':
      return PRIORITY_RANK[order.priority] ?? 0
    case 'status':
      return order.status
    default:
      return order.created_date ?? order.createdDate ?? null
  }
}

/** The list's sort, applied on the device to the saved copy (no connection). */
function sortWorkOrdersOffline(
  rows: TeamBasedWorkOrder[],
  field: SortField,
  direction: SortDirection,
): TeamBasedWorkOrder[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = offlineSortValue(a, field)
    const right = offlineSortValue(b, field)
    if (left === right) {
      return a.id.localeCompare(b.id)
    }
    // Rows without a value go last whichever way the list is sorted.
    if (left === null) {
      return 1
    }
    if (right === null) {
      return -1
    }
    const order =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right))
    return order * sign
  })
}

function selectedTeamFilterValue(selectedTeamId: string | null): string {
  if (selectedTeamId === null) {
    return 'all'
  }
  if (selectedTeamId === UNASSIGNED_TEAM_ID) {
    return 'unassigned'
  }
  return selectedTeamId
}

function toOfflineListRow(order: ReturnType<typeof buildOfflineQueuedWorkOrder>): TeamBasedWorkOrder {
  return {
    ...order,
    equipmentId: order.equipment_id,
    organizationId: order.organization_id,
    assigneeId: order.assignee_id,
    teamId: order.equipmentTeamId,
    createdDate: order.created_date,
    dueDate: order.due_date,
    estimatedHours: order.estimated_hours,
    completedDate: order.completed_date,
    teamName: order.equipmentTeamName,
  }
}

export function useWorkOrderFiltering() {
  const { currentOrganization } = useOrganization()
  const { currentUser } = useUser()
  const { user } = useAuth()
  const { selectedTeamId } = useSelectedTeam()
  const { userTeamIds, isManager, isLoading: teamAccessLoading } = useTeamBasedAccess()
  const offlineCtx = useOfflineQueueOptional()
  const { data: allEquipment = [] } = useEquipmentSummaries(currentOrganization?.id)

  const [filters, setFilters] = useState<WorkOrderFilters>(DEFAULT_WORK_ORDER_FILTERS)
  const [activePresets, setActivePresets] = useState<Set<QuickFilterPreset>>(new Set())
  const [sortField, setSortField] = useState<SortField>('created')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPageState] = useState(1)
  const [pageSize, setPageSizeState] = useState(DEFAULT_WORK_ORDER_CARD_PAGE_SIZE)

  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const sortFieldRef = useRef(sortField)
  sortFieldRef.current = sortField
  const sortDirectionRef = useRef(sortDirection)
  sortDirectionRef.current = sortDirection
  const selectedTeamIdRef = useRef(selectedTeamId)
  const resetPagination = useCallback(() => {
    setCurrentPageState(1)
  }, [])

  useEffect(() => {
    if (selectedTeamIdRef.current === selectedTeamId) {
      return
    }
    selectedTeamIdRef.current = selectedTeamId
    resetPagination()
  }, [resetPagination, selectedTeamId])

  const organizationId = currentOrganization?.id
  const rbacReady = !teamAccessLoading && Boolean(organizationId)

  const contract = useMemo(() => {
    if (!organizationId) {
      return undefined
    }
    return parseWorkOrderListContract({
      organizationId,
      filters,
      selectedTeamId,
      currentUserId: currentUser?.id,
      isOrgAdmin: isManager,
      userTeamIds,
    })
  }, [currentUser?.id, filters, isManager, organizationId, selectedTeamId, userTeamIds])

  const pagination = useMemo(
    () => ({
      page: currentPage,
      pageSize,
      sortField,
      sortDirection,
    }),
    [currentPage, pageSize, sortDirection, sortField],
  )

  const listQuery = useWorkOrderList(contract, pagination, { enabled: rbacReady })

  const accessibleQuery = useQuery({
    queryKey: contract
      ? [...workOrders.pagedList(contract.organizationId), 'accessible', contract.team, contract.access]
      : workOrders.pagedList('unknown'),
    queryFn: () => {
      if (!contract) {
        return 0
      }
      return getAccessibleWorkOrderCount(contract)
    },
    enabled: rbacReady && Boolean(contract),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const unassignedQuery = useQuery({
    queryKey: contract
      ? [...workOrders.pagedList(contract.organizationId), 'unassigned-submitted', contract.access]
      : workOrders.pagedList('unknown'),
    queryFn: () => {
      if (!contract) {
        return 0
      }
      return getUnassignedSubmittedCount(contract)
    },
    enabled: rbacReady && Boolean(contract),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const offlineRows = useMemo(() => {
    if (!offlineCtx) {
      return []
    }
    const pendingCreates = offlineCtx.queuedItems.filter(
      (item): item is OfflineQueueCreateItem =>
        item.type === 'work_order_create' &&
        (item.status === 'pending' || item.status === 'processing'),
    )
    if (pendingCreates.length === 0) {
      return []
    }
    const rows = pendingCreates.map((item) => {
      const queued = buildOfflineQueuedWorkOrder({
        item,
        allEquipment,
        userDisplayName: user?.user_metadata?.full_name ?? null,
      })
      const equipment = allEquipment.find((entry) => entry.id === queued.equipment_id)
      return toOfflineListRow({
        ...queued,
        equipmentTeamId: queued.equipmentTeamId ?? equipment?.team_id ?? undefined,
      })
    })
    return filterWorkOrders(
      rows,
      { ...filters, teamFilter: selectedTeamFilterValue(selectedTeamId) },
      currentUser?.id,
    )
  }, [allEquipment, currentUser?.id, filters, offlineCtx, selectedTeamId, user?.user_metadata?.full_name])

  // With no connection the server cannot filter or page the list. Use the
  // copy the background download saved on this device and do it here.
  const savedList = useOfflineSavedList<TeamBasedWorkOrder>(
    organizationId && rbacReady
      ? offlineSavedKeys.workOrderList(organizationId, teamAccessQueryScope(isManager, userTeamIds))
      : undefined,
  )
  const useSaved = shouldUseSavedList(savedList, listQuery)
  const offlineList = useMemo(() => {
    if (!useSaved || !savedList) {
      return null
    }
    const matching = filterWorkOrders(
      savedList.rows,
      { ...filters, teamFilter: selectedTeamFilterValue(selectedTeamId) },
      currentUser?.id,
    )
    return sortWorkOrdersOffline(matching, sortField, sortDirection)
  }, [currentUser?.id, filters, savedList, selectedTeamId, sortDirection, sortField, useSaved])

  const workOrdersPage = useMemo(() => {
    const serverRows = offlineList
      ? pageOf(offlineList, currentPage, pageSize)
      : listQuery.data?.data ?? []
    if (currentPage !== 1 || offlineRows.length === 0) {
      return serverRows
    }
    return [...offlineRows, ...serverRows]
  }, [currentPage, listQuery.data?.data, offlineList, offlineRows, pageSize])

  const updateFilter = useCallback(
    (key: keyof WorkOrderFilters, value: string) => {
      if (filtersRef.current[key] === value) {
        return
      }
      setFilters((prev) => ({ ...prev, [key]: value }))
      setActivePresets((prev) => nextPresetsAfterFilterChange(prev, key, value))
      resetPagination()
    },
    [resetPagination],
  )

  const updateSort = useCallback(
    (field: SortField, direction?: SortDirection) => {
      const prevField = sortFieldRef.current
      const prevDirection = sortDirectionRef.current
      const nextDirection =
        direction ??
        (prevField === field ? (prevDirection === 'asc' ? 'desc' : 'asc') : field === 'due_date' ? 'asc' : 'desc')
      if (prevField === field && prevDirection === nextDirection) {
        return
      }
      setSortField(field)
      setSortDirection(nextDirection)
      resetPagination()
    },
    [resetPagination],
  )

  const toggleQuickFilter = useCallback(
    (preset: QuickFilterPreset) => {
      setActivePresets((prev) => {
        const wasActive = prev.has(preset)
        const mapping = PRESET_FILTER_MAP[preset]
        setFilters((current) => {
          const resetPresetFilters: WorkOrderFilters = {
            ...current,
            assigneeFilter: 'all',
            priorityFilter: 'all',
            dueDateFilter: 'all',
          }
          if (wasActive) {
            return resetPresetFilters
          }
          return {
            ...resetPresetFilters,
            [mapping.key]: mapping.value,
          }
        })
        resetPagination()
        return wasActive ? new Set() : new Set([preset])
      })
    },
    [resetPagination],
  )

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_WORK_ORDER_FILTERS)
    setActivePresets(new Set())
    resetPagination()
  }, [resetPagination])

  const setCurrentPage = useCallback((page: number) => {
    setCurrentPageState(page)
  }, [])

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size)
    setCurrentPageState(1)
  }, [])

  const getActiveFilterCount = useCallback(() => {
    return countActiveWorkOrderFilters(filters)
  }, [filters])

  const hasActiveFilters = getActiveFilterCount() > 0 || filters.searchQuery.length > 0

  return {
    workOrders: workOrdersPage,
    totalFilteredCount: offlineList ? offlineList.length : listQuery.data?.count ?? 0,
    totalAccessibleCount: accessibleQuery.data ?? savedList?.rows.length ?? 0,
    currentPage,
    pageSize,
    pageSizeOptions: WORK_ORDER_CARD_PAGE_SIZE_OPTIONS,
    filters,
    sortField,
    sortDirection,
    activePresets,
    isLoading: offlineList ? false : !rbacReady || listQuery.isLoading,
    hasActiveFilters,
    unassignedSubmittedCount: unassignedQuery.data ?? 0,
    updateFilter,
    updateSort,
    toggleQuickFilter,
    clearAllFilters,
    setCurrentPage,
    setPageSize,
    getActiveFilterCount,
  }
}
