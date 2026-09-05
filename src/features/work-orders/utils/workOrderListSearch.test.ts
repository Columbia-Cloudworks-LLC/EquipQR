import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const { supabase } = await import('@/integrations/supabase/client')
const {
  buildWorkOrderListSearchOrClause,
  getWorkOrderSearchPattern,
  resolveWorkOrderListSearchOr,
} = await import('./workOrderListSearch')

function createLookupChain(result: { data: Array<{ id: string }> | null; error: null | Error }) {
  const query: Record<string, unknown> = {
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  }
  const self = () => query
  query.select = vi.fn(self)
  query.eq = vi.fn(self)
  query.ilike = vi.fn(self)
  query.in = vi.fn(self)
  return query
}

describe('buildWorkOrderListSearchOrClause', () => {
  it('keeps search on work_orders columns so PostgREST can parse or()', () => {
    expect(
      buildWorkOrderListSearchOrClause({
        pattern: '%yard%',
        assigneeIds: ['user-1'],
        equipmentIds: ['eq-1', 'eq-2'],
      }),
    ).toBe('title.ilike.%yard%,assignee_id.in.(user-1),equipment_id.in.(eq-1,eq-2)')
  })

  it('omits empty id lists', () => {
    expect(
      buildWorkOrderListSearchOrClause({
        pattern: '%pump%',
        assigneeIds: [],
        equipmentIds: [],
      }),
    ).toBe('title.ilike.%pump%')
  })
})

describe('getWorkOrderSearchPattern', () => {
  it('strips or() reserved characters and wraps the term', () => {
    expect(getWorkOrderSearchPattern('  yard, (pump)  ')).toBe('%yard pump%')
    expect(getWorkOrderSearchPattern('   ')).toBeNull()
  })
})

describe('resolveWorkOrderListSearchOr', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns null when search is empty', async () => {
    await expect(
      resolveWorkOrderListSearchOr({ organizationId: 'org-1', search: undefined }),
    ).resolves.toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('resolves assignee and equipment ids including equipment on matching teams', async () => {
    const profiles = createLookupChain({ data: [{ id: 'user-1' }], error: null })
    const namedEquipment = createLookupChain({ data: [{ id: 'eq-name' }], error: null })
    const teams = createLookupChain({ data: [{ id: 'team-1' }], error: null })
    const teamEquipment = createLookupChain({ data: [{ id: 'eq-team' }], error: null })
    let equipmentCalls = 0

    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'profiles') return profiles
      if (table === 'teams') return teams
      if (table === 'equipment') {
        equipmentCalls += 1
        return equipmentCalls === 1 ? namedEquipment : teamEquipment
      }
      throw new Error(`unexpected table ${table}`)
    })

    const clause = await resolveWorkOrderListSearchOr({
      organizationId: 'org-1',
      search: 'yard',
    })

    expect(clause).toBe(
      'title.ilike.%yard%,assignee_id.in.(user-1),equipment_id.in.(eq-name,eq-team)',
    )
    expect(namedEquipment.eq).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(namedEquipment.ilike).toHaveBeenCalledWith('name', '%yard%')
    expect(teamEquipment.in).toHaveBeenCalledWith('team_id', ['team-1'])
  })
})
