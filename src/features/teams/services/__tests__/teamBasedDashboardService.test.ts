import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';
import { applySelectedTeamFilter } from '@/features/dashboard/utils/dashboardTeamScope';
import { getTeamBasedDashboardStats } from '@/features/teams/services/teamBasedDashboardService';

function createQueryChain(resolved: { data: unknown; error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> & {
    then: Promise<{ data: unknown; error: null }>['then'];
  } = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    not: vi.fn(),
    then(onFulfilled, onRejected) {
      return Promise.resolve(resolved).then(onFulfilled, onRejected);
    },
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.not.mockReturnValue(chain);
  return chain;
}

let equipmentChain = createQueryChain({ data: [{ id: 'eq-1' }], error: null });
let workOrderChain = createQueryChain({ data: [{ status: 'submitted', due_date: null }], error: null });
let teamChain = createQueryChain({ data: [{ id: 'team-a' }], error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'equipment') return equipmentChain;
      if (table === 'work_orders') return workOrderChain;
      if (table === 'teams') return teamChain;
      throw new Error(`Unexpected table ${table}`);
    }),
  },
}));

vi.mock('@/features/equipment/services/EquipmentService', () => ({
  EquipmentService: {
    getAccessibleEquipmentIds: vi.fn(),
    getTeamAccessibleEquipment: vi.fn(),
  },
}));

describe('dashboard team scope (#1075)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    equipmentChain = createQueryChain({ data: [{ id: 'eq-1' }], error: null });
    workOrderChain = createQueryChain({ data: [{ status: 'submitted', due_date: null }], error: null });
    teamChain = createQueryChain({ data: [{ id: 'team-a' }], error: null });
  });

  it('applySelectedTeamFilter scopes equipment queries to a team uuid', () => {
    const query = { eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis() };
    applySelectedTeamFilter(query, 'team-a');
    expect(query.eq).toHaveBeenCalledWith('team_id', 'team-a');
  });

  it('applySelectedTeamFilter scopes equipment queries to unassigned', () => {
    const query = { eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis() };
    applySelectedTeamFilter(query, UNASSIGNED_TEAM_ID);
    expect(query.is).toHaveBeenCalledWith('team_id', null);
  });

  it('getTeamBasedDashboardStats applies team filter for org admins', async () => {
    equipmentChain = createQueryChain({ data: [{ id: 'eq-1', status: 'active' }], error: null });

    await getTeamBasedDashboardStats('org-1', [], true, 'team-a');

    expect(equipmentChain.eq).toHaveBeenCalledWith('team_id', 'team-a');
    expect(teamChain.eq).toHaveBeenCalledWith('id', 'team-a');
  });
});
