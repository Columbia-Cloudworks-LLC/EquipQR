import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EquipmentService } from './EquipmentService';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const { supabase } = await import('@/integrations/supabase/client');

/**
 * Issue #633: the equipment service must flatten the `team:team_id(id, name)`
 * Supabase join into a top-level `team_name` field so UI consumers (the dense
 * EquipmentTable + EquipmentCard) render the team name instead of '—'.
 */
describe('EquipmentService team_name flattening', () => {
  const organizationId = 'org-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll populates team_name from the team join object', async () => {
    const mockRows = [
      {
        id: 'eq-1',
        organization_id: organizationId,
        name: 'Forklift A',
        status: 'active',
        team_id: 't1',
        team: { id: 't1', name: 'Alpha Crew' },
      },
      {
        id: 'eq-2',
        organization_id: organizationId,
        name: 'Excavator B',
        status: 'maintenance',
        team_id: null,
        team: null,
      },
    ];

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
    };
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

    const result = await EquipmentService.getAll(organizationId);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0].team_name).toBe('Alpha Crew');
    expect(result.data?.[1].team_name).toBeUndefined();
  });

  it('getById populates team_name from the team join object', async () => {
    const mockRow = {
      id: 'eq-1',
      organization_id: organizationId,
      name: 'Forklift A',
      status: 'active',
      team_id: 't1',
      team: { id: 't1', name: 'Beta Squad' },
    };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
    };
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

    const result = await EquipmentService.getById(organizationId, 'eq-1');

    expect(result.success).toBe(true);
    expect(result.data?.team_name).toBe('Beta Squad');
  });
});
