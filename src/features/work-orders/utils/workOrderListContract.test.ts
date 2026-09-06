import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { filterWorkOrders } from '@/features/work-orders/hooks/workOrderFilterUtils'
import {
  matchesWorkOrderListContract,
  parseWorkOrderListContract,
} from '@/features/work-orders/utils/workOrderListContract'
import {
  ALL_LIST_CONTRACT_FIXTURES,
  LIST_CONTRACT_FIXTURES,
  LIST_CONTRACT_NOW,
  UNASSIGNED_TEAM_ID,
  parseInput,
} from '@/features/work-orders/utils/workOrderListContract.fixtures'

function idsMatchingFilters(
  filters: Parameters<typeof filterWorkOrders>[1],
  currentUserId?: string,
): string[] {
  return filterWorkOrders(ALL_LIST_CONTRACT_FIXTURES, filters, currentUserId).map(
    (order) => order.id,
  )
}

function idsMatchingContract(
  input: ReturnType<typeof parseInput>,
): string[] {
  const contract = parseWorkOrderListContract(input)
  return ALL_LIST_CONTRACT_FIXTURES.filter((order) =>
    matchesWorkOrderListContract(order, contract),
  ).map((order) => order.id)
}

describe('parseWorkOrderListContract', () => {
  it('builds mine only when a user id is present', () => {
    expect(
      parseWorkOrderListContract(parseInput({ filters: { assigneeFilter: 'mine' } })).assignee,
    ).toEqual({ kind: 'mine', userId: 'user-1' })

    expect(
      parseWorkOrderListContract(
        parseInput({ currentUserId: undefined, filters: { assigneeFilter: 'mine' } }),
      ).assignee,
    ).toEqual({ kind: 'all' })
  })

  it('parses assignee unassigned and named users', () => {
    expect(
      parseWorkOrderListContract(parseInput({ filters: { assigneeFilter: 'unassigned' } }))
        .assignee,
    ).toEqual({ kind: 'unassigned' })
    expect(
      parseWorkOrderListContract(parseInput({ filters: { assigneeFilter: 'user-9' } })).assignee,
    ).toEqual({ kind: 'user', userId: 'user-9' })
  })

  it('parses TopBar team, not page-local teamFilter', () => {
    expect(
      parseWorkOrderListContract(
        parseInput({
          selectedTeamId: 'team-topbar',
          filters: { teamFilter: 'team-ignored' },
        }),
      ).team,
    ).toEqual({ kind: 'team', teamId: 'team-topbar' })

    expect(
      parseWorkOrderListContract(parseInput({ selectedTeamId: UNASSIGNED_TEAM_ID })).team,
    ).toEqual({ kind: 'unassigned' })
  })

  it('keeps due and invoice as kinds, not clock instants', () => {
    const contract = parseWorkOrderListContract(
      parseInput({
        filters: { dueDateFilter: 'this_week', invoiceFilter: 'unpaid', searchQuery: '  yard  ' },
      }),
    )

    expect(contract.dueDate).toEqual({ kind: 'this_week' })
    expect(contract.invoice).toEqual({ kind: 'unpaid' })
    expect(contract.search).toBe('yard')
    expect(JSON.stringify(contract)).not.toContain(LIST_CONTRACT_NOW.toISOString())
  })

  it('does not run member access through org-admin', () => {
    expect(
      parseWorkOrderListContract(
        parseInput({ isOrgAdmin: false, userTeamIds: ['team-a', 'team-b'] }),
      ).access,
    ).toEqual({ kind: 'teams', teamIds: ['team-a', 'team-b'] })

    expect(
      parseWorkOrderListContract(parseInput({ isOrgAdmin: false, userTeamIds: [] })).access,
    ).toEqual({ kind: 'none' })
  })
})

describe('matchesWorkOrderListContract vs filterWorkOrders', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(LIST_CONTRACT_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('matches mine', () => {
    const filters = { assigneeFilter: 'mine' as const }
    const input = parseInput({ filters })
    const expected = idsMatchingFilters({ ...input.filters }, 'user-1')

    expect(expected).toEqual(['wo-mine'])
    expect(idsMatchingContract(input)).toEqual(expected)
  })

  it('matches assignee unassigned only when there is no assignee and no effective team', () => {
    const filters = { assigneeFilter: 'unassigned' as const }
    const input = parseInput({ filters })
    const expected = idsMatchingFilters({ ...input.filters }, 'user-1')

    expect(expected).toEqual(['wo-unassigned-no-team'])
    expect(expected).not.toContain('wo-unassigned-with-team')
    expect(idsMatchingContract(input)).toEqual(expected)
  })

  it('matches this_week with Sunday weekStartsOn', () => {
    const filters = { dueDateFilter: 'this_week' as const }
    const input = parseInput({ filters })
    const expected = idsMatchingFilters({ ...input.filters }, 'user-1')

    expect(expected).toContain('wo-sunday-week')
    expect(expected).not.toContain('wo-prev-saturday')
    expect(idsMatchingContract(input)).toEqual(expected)
  })

  it('matches invoice unpaid for exported null and collectible statuses', () => {
    const filters = { invoiceFilter: 'unpaid' as const }
    const input = parseInput({ filters })
    const expected = idsMatchingFilters({ ...input.filters }, 'user-1')

    expect(expected.sort()).toEqual(['wo-unpaid-draft', 'wo-unpaid-null'].sort())
    expect(idsMatchingContract(input).sort()).toEqual(expected.sort())
  })

  it('matches search on equipment team name', () => {
    const filters = { searchQuery: 'yard' }
    const input = parseInput({ filters })
    const expected = idsMatchingFilters({ ...input.filters }, 'user-1')

    expect(expected).toEqual(['wo-search-team'])
    expect(idsMatchingContract(input)).toEqual(expected)
  })

  it('matches TopBar team via effective team COALESCE', () => {
    const input = parseInput({
      selectedTeamId: 'team-topbar',
      filters: { teamFilter: 'team-topbar' },
    })
    const expected = idsMatchingFilters({ ...input.filters }, 'user-1')

    expect(expected.sort()).toEqual(
      ['wo-coalesce-eq-team', 'wo-coalesce-wo-team'].sort(),
    )
    expect(expected).not.toContain('wo-other-effective')
    expect(idsMatchingContract(input).sort()).toEqual(expected.sort())
  })
})

describe('LIST_CONTRACT_FIXTURES', () => {
  it('keeps Sunday-week distinct from the previous Saturday', () => {
    expect(LIST_CONTRACT_FIXTURES.sundayThisWeek.dueDate).toBe('2026-08-30T12:00:00.000Z')
    expect(LIST_CONTRACT_FIXTURES.previousSaturday.dueDate).toBe('2026-08-29T12:00:00.000Z')
  })
})
