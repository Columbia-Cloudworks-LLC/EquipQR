import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EquipmentService } from './EquipmentService';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const { supabase } = await import('@/integrations/supabase/client');

/**
 * Each call to `EquipmentService.batchUpdate` invokes `supabase.from('equipment')`
 * once per row. The chain `.update(data).eq(id).eq(org).select('id')` is identical
 * shape per row, so we mock `supabase.from` to return a fresh chained mock that
 * resolves with whatever `selectOutcome` we supply for that row.
 */
function makeRowMock(selectOutcome: { data: Array<{ id: string }> | null; error: { message: string } | null }) {
  const chain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue(selectOutcome),
  };
  return chain;
}

describe('EquipmentService.batchUpdate', () => {
  const organizationId = 'test-org';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty succeeded/failed lists when given an empty input array', async () => {
    const result = await EquipmentService.batchUpdate(organizationId, []);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ succeeded: [], failed: [] });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('reports every id as succeeded when every row update returns rows', async () => {
    const ids = ['eq-1', 'eq-2', 'eq-3', 'eq-4', 'eq-5'];

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      makeRowMock({ data: [{ id: 'placeholder' }], error: null })
    );

    const updates = ids.map((id) => ({ id, data: { name: `Updated ${id}` } }));
    const result = await EquipmentService.batchUpdate(organizationId, updates);

    expect(result.success).toBe(true);
    expect(result.data?.succeeded).toEqual(ids);
    expect(result.data?.failed).toEqual([]);
    expect(supabase.from).toHaveBeenCalledTimes(5);
  });

  it('partitions succeeded vs failed when some rows error and others succeed', async () => {
    const updates = [
      { id: 'eq-1', data: { name: 'one' } },
      { id: 'eq-2', data: { name: 'two' } },
      { id: 'eq-3', data: { name: 'three' } },
      { id: 'eq-4', data: { name: 'four' } },
      { id: 'eq-5', data: { name: 'five' } },
    ];

    const outcomes = [
      { data: [{ id: 'eq-1' }], error: null },
      { data: null, error: { message: 'permission denied' } },
      { data: [{ id: 'eq-3' }], error: null },
      { data: null, error: { message: 'constraint violation' } },
      { data: [{ id: 'eq-5' }], error: null },
    ];

    let callIndex = 0;
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const outcome = outcomes[callIndex++];
      return makeRowMock(outcome);
    });

    const result = await EquipmentService.batchUpdate(organizationId, updates);

    expect(result.success).toBe(true);
    expect(result.data?.succeeded).toEqual(['eq-1', 'eq-3', 'eq-5']);
    expect(result.data?.failed).toEqual([
      { id: 'eq-2', error: 'permission denied' },
      { id: 'eq-4', error: 'constraint violation' },
    ]);
  });

  it('treats a zero-row update as a per-row failure (RLS hides the row)', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      makeRowMock({ data: [], error: null })
    );

    const result = await EquipmentService.batchUpdate(organizationId, [
      { id: 'eq-other-org', data: { name: 'cross-org' } },
    ]);

    expect(result.success).toBe(true);
    expect(result.data?.succeeded).toEqual([]);
    expect(result.data?.failed).toEqual([
      { id: 'eq-other-org', error: 'Equipment not found or access denied' },
    ]);
  });

  it('reports every id as failed when every row update returns an error', async () => {
    const updates = [
      { id: 'eq-1', data: { name: 'one' } },
      { id: 'eq-2', data: { name: 'two' } },
      { id: 'eq-3', data: { name: 'three' } },
    ];

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() =>
      makeRowMock({ data: null, error: { message: 'database unavailable' } })
    );

    const result = await EquipmentService.batchUpdate(organizationId, updates);

    expect(result.success).toBe(true);
    expect(result.data?.succeeded).toEqual([]);
    expect(result.data?.failed).toEqual([
      { id: 'eq-1', error: 'database unavailable' },
      { id: 'eq-2', error: 'database unavailable' },
      { id: 'eq-3', error: 'database unavailable' },
    ]);
  });

  it('chunks large batches and aggregates results across chunks (concurrency cap = 10)', async () => {
    // 25 rows → 3 chunks of 10 + 10 + 5. Mix in 1 failure per chunk to verify
    // accounting works across chunk boundaries.
    const updates = Array.from({ length: 25 }, (_, i) => ({
      id: `eq-${i + 1}`,
      data: { name: `Updated ${i + 1}` },
    }));

    let callIndex = 0;
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const i = callIndex++;
      // Fail rows 5, 15, 25 (one per chunk) so we can prove failures from
      // each chunk land in the aggregate `failed` list.
      if (i === 4 || i === 14 || i === 24) {
        return makeRowMock({ data: null, error: { message: `boom-${i + 1}` } });
      }
      return makeRowMock({ data: [{ id: `eq-${i + 1}` }], error: null });
    });

    const result = await EquipmentService.batchUpdate(organizationId, updates);

    expect(result.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledTimes(25);
    expect(result.data?.succeeded).toHaveLength(22);
    expect(result.data?.failed).toEqual([
      { id: 'eq-5', error: 'boom-5' },
      { id: 'eq-15', error: 'boom-15' },
      { id: 'eq-25', error: 'boom-25' },
    ]);
  });

  it('captures unexpected promise rejections as per-row failures', async () => {
    let callIndex = 0;
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockRejectedValue(new Error('network down')),
        };
      }
      return makeRowMock({ data: [{ id: 'eq-2' }], error: null });
    });

    const result = await EquipmentService.batchUpdate(organizationId, [
      { id: 'eq-1', data: { name: 'one' } },
      { id: 'eq-2', data: { name: 'two' } },
    ]);

    expect(result.success).toBe(true);
    expect(result.data?.succeeded).toEqual(['eq-2']);
    expect(result.data?.failed).toEqual([{ id: 'eq-1', error: 'network down' }]);
  });
});
