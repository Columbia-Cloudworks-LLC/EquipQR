import { act, renderHook } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context'

const selectedTeam = vi.hoisted(() => ({
  selectedTeamId: null as string | null,
}))

vi.mock('@/features/work-orders/hooks/useWorkOrderList', () => ({
  useWorkOrderList: vi.fn(),
}))

vi.mock('@/features/work-orders/services/workOrderListService', () => ({
  getAccessibleWorkOrderCount: vi.fn(async () => 20),
  getUnassignedSubmittedCount: vi.fn(async () => 1),
}))

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { id: 'org-1', userRole: 'owner' } }),
}))

vi.mock('@/contexts/useUser', () => ({
  useUser: () => ({ currentUser: { id: 'user-1' } }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', user_metadata: {} } }),
}))

vi.mock('@/hooks/useSelectedTeam', () => ({
  useSelectedTeam: () => selectedTeam,
}))

vi.mock('@/features/teams/hooks/useTeamBasedWorkOrders', () => ({
  useTeamBasedAccess: () => ({
    userTeamIds: ['team-1'],
    isManager: true,
    isLoading: false,
  }),
}))

vi.mock('@/contexts/OfflineQueueContext', () => ({
  useOfflineQueueOptional: () => null,
}))

vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipmentSummaries: () => ({ data: [] }),
}))

import { useWorkOrderList } from '@/features/work-orders/hooks/useWorkOrderList'
import { useWorkOrderFiltering } from '@/features/work-orders/hooks/useWorkOrderFiltering'

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useWorkOrderFiltering', () => {
  beforeEach(() => {
    selectedTeam.selectedTeamId = null
    ;(useWorkOrderList as Mock).mockReturnValue({
      data: { data: [], count: 0 },
      isLoading: false,
    })
  })

  it('resets to page 1 when a filter changes', () => {
    const { result } = renderHook(() => useWorkOrderFiltering(), { wrapper })

    act(() => result.current.setCurrentPage(3))
    expect(result.current.currentPage).toBe(3)

    act(() => result.current.updateFilter('statusFilter', 'submitted'))
    expect(result.current.currentPage).toBe(1)
  })

  it('does not reset the page on a no-op TopBar team mirror', () => {
    const { result } = renderHook(() => useWorkOrderFiltering(), { wrapper })

    act(() => result.current.setCurrentPage(2))
    expect(result.current.currentPage).toBe(2)

    act(() => result.current.updateFilter('teamFilter', 'all'))
    expect(result.current.currentPage).toBe(2)
  })

  it('resets to page 1 when the TopBar team identity changes', () => {
    const { result, rerender } = renderHook(() => useWorkOrderFiltering(), { wrapper })

    act(() => result.current.setCurrentPage(2))
    selectedTeam.selectedTeamId = UNASSIGNED_TEAM_ID
    rerender()

    expect(result.current.currentPage).toBe(1)
  })
})
