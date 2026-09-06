import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseWorkOrderListContract } from '@/features/work-orders/utils/workOrderListContract'
import { parseInput } from '@/features/work-orders/utils/workOrderListContract.fixtures'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('@/features/work-orders/utils/workOrderListSearch', () => ({
  resolveWorkOrderListSearchOr: vi.fn(async () => null),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/services/imageUploadService', () => ({
  batchResolveEquipmentDisplayImageUrls: vi.fn(async (urls: Array<string | null>) =>
    urls.map(() => null),
  ),
}))

const { supabase } = await import('@/integrations/supabase/client')
const { resolveWorkOrderListSearchOr } = await import(
  '@/features/work-orders/utils/workOrderListSearch'
)
const { getAccessibleWorkOrderCount, getFilteredList, getUnassignedSubmittedCount } = await import(
  './workOrderListService'
)

function createFilterChain(result: { data: unknown[] | null; count: number; error: null }) {
  const query: Record<string, unknown> = {
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  }
  const self = () => query
  query.select = vi.fn(self)
  query.eq = vi.fn(self)
  query.not = vi.fn(self)
  query.is = vi.fn(self)
  query.or = vi.fn(self)
  query.in = vi.fn(self)
  query.lt = vi.fn(self)
  query.lte = vi.fn(self)
  query.gte = vi.fn(self)
  query.order = vi.fn(self)
  query.range = vi.fn().mockResolvedValue(result)
  return query as Record<string, ReturnType<typeof vi.fn>> & {
    then: (resolve: (value: typeof result) => unknown) => Promise<typeof result>
  }
}

describe('getFilteredList', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(resolveWorkOrderListSearchOr).mockResolvedValue(null)
  })

  it('returns an empty page without querying when access is none', async () => {
    const contract = parseWorkOrderListContract(
      parseInput({ isOrgAdmin: false, userTeamIds: [] }),
    )

    const result = await getFilteredList(contract, { page: 1, pageSize: 12 })

    expect(result).toEqual({ data: [], count: 0 })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('requests exact count and a zero-based range', async () => {
    const query = createFilterChain({ data: [], count: 37, error: null })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(query)

    const result = await getFilteredList(
      parseWorkOrderListContract(parseInput()),
      { page: 2, pageSize: 12, sortField: 'created', sortDirection: 'desc' },
    )

    expect(query.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' })
    expect(query.order).toHaveBeenCalledWith('created_date', { ascending: false })
    expect(query.order).toHaveBeenCalledWith('id', { ascending: true })
    expect(query.range).toHaveBeenCalledWith(12, 23)
    expect(result.count).toBe(37)
  })

  it('applies the resolved parent-column search or() on work_orders', async () => {
    const query = createFilterChain({ data: [], count: 2, error: null })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(query)
    vi.mocked(resolveWorkOrderListSearchOr).mockResolvedValueOnce(
      'title.ilike.%yard%,assignee_id.in.(user-1)',
    )

    await getFilteredList(
      parseWorkOrderListContract(parseInput({ filters: { searchQuery: 'yard' } })),
      { page: 1, pageSize: 12 },
    )

    expect(query.or).toHaveBeenCalledWith('title.ilike.%yard%,assignee_id.in.(user-1)')
  })

  it('clamps page size to 200', async () => {
    const query = createFilterChain({ data: [], count: 0, error: null })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(query)

    await getFilteredList(parseWorkOrderListContract(parseInput()), {
      page: 1,
      pageSize: 500,
    })

    expect(query.range).toHaveBeenCalledWith(0, 199)
  })
})

describe('work order list head counts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(resolveWorkOrderListSearchOr).mockResolvedValue(null)
  })

  it('returns zero accessible rows without querying when access is none', async () => {
    const count = await getAccessibleWorkOrderCount(
      parseWorkOrderListContract(parseInput({ isOrgAdmin: false, userTeamIds: [] })),
    )
    expect(count).toBe(0)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('requests an exact head count for unassigned submitted rows', async () => {
    const query = createFilterChain({ data: null, count: 4, error: null })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(query)

    const count = await getUnassignedSubmittedCount(parseWorkOrderListContract(parseInput()))

    expect(count).toBe(4)
    expect(query.select).toHaveBeenCalledWith(expect.any(String), {
      count: 'exact',
      head: true,
    })
  })
})
