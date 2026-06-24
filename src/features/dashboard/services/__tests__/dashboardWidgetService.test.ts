import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchEquipmentByStatus } from '@/features/dashboard/services/dashboardWidgetService';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';

function createQueryChain(resolved: { data: unknown; error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> & {
    then: Promise<{ data: unknown; error: null }>['then'];
  } = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    then(onFulfilled, onRejected) {
      return Promise.resolve(resolved).then(onFulfilled, onRejected);
    },
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
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
  });

  it('filters by team uuid when selected', async () => {
    await fetchEquipmentByStatus('org-1', 'team-a');
    expect(equipmentChain.eq).toHaveBeenCalledWith('team_id', 'team-a');
  });

  it('filters unassigned equipment when sentinel selected', async () => {
    await fetchEquipmentByStatus('org-1', UNASSIGNED_TEAM_ID);
    expect(equipmentChain.is).toHaveBeenCalledWith('team_id', null);
  });
});
