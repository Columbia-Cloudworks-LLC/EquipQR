import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchEquipmentByStatus } from '@/features/dashboard/services/dashboardWidgetService';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';
import { supabase } from '@/integrations/supabase/client';

function createQueryChain(resolved: { data: unknown; error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> & {
    then: Promise<{ data: unknown; error: null }>['then'];
  } = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    in: vi.fn(),
    then(onFulfilled, onRejected) {
      return Promise.resolve(resolved).then(onFulfilled, onRejected);
    },
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  return chain;
}

let equipmentChain = createQueryChain({ data: [{ status: 'active' }], error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => equipmentChain),
  },
}));

describe('fetchEquipmentByStatus team scope (#1075)', () => {
  beforeEach(() => {
    equipmentChain = createQueryChain({ data: [{ status: 'active' }], error: null });
    vi.mocked(supabase.from).mockClear();
    vi.mocked(supabase.from).mockReturnValue(equipmentChain as never);
  });

  it('filters by team uuid when selected', async () => {
    await fetchEquipmentByStatus('org-1', 'team-a', ['team-a'], false);
    expect(equipmentChain.eq).toHaveBeenCalledWith('team_id', 'team-a');
  });

  it('filters unassigned equipment when sentinel selected', async () => {
    await fetchEquipmentByStatus('org-1', UNASSIGNED_TEAM_ID, [], true);
    expect(equipmentChain.is).toHaveBeenCalledWith('team_id', null);
  });

  it('scopes non-admin All teams to accessible team ids', async () => {
    await fetchEquipmentByStatus('org-1', null, ['team-a', 'team-b'], false);
    expect(equipmentChain.in).toHaveBeenCalledWith('team_id', ['team-a', 'team-b']);
  });

  it('returns empty for non-admin unassigned selection without querying', async () => {
    const rows = await fetchEquipmentByStatus('org-1', UNASSIGNED_TEAM_ID, ['team-a'], false);
    expect(rows).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns empty for non-admin with no team memberships on All teams', async () => {
    const rows = await fetchEquipmentByStatus('org-1', null, [], false);
    expect(rows).toEqual([]);
  });
});
