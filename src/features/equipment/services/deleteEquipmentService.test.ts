import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockFrom, mockRequireUserId, mockDeleteWorkOrder } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRequireUserId: vi.fn(),
  mockDeleteWorkOrder: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: { from: () => ({ remove: vi.fn().mockResolvedValue({ error: null }) }) },
  },
}));

vi.mock('@/lib/authClaims', () => ({
  requireAuthUserIdFromClaims: (...args: unknown[]) => mockRequireUserId(...args),
}));

vi.mock('@/features/work-orders/services/deleteWorkOrderService', () => ({
  deleteWorkOrder: (...args: unknown[]) => mockDeleteWorkOrder(...args),
}));

vi.mock('@/services/imageUploadService', () => ({
  normalizeStoredObjectPath: (url: string) => url,
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { deleteEquipmentCascade } = await import('./deleteEquipmentService');

const ORG_ID = 'org-1';
const EQUIP_ID = 'eq-1';

/** Build a thenable Supabase query chain that resolves to `result`. */
function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.select = vi.fn(ret);
  chain.eq = vi.fn(ret);
  chain.delete = vi.fn(ret);
  chain.in = vi.fn(ret);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  chain.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return chain;
}

describe('deleteEquipmentCascade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue('user-1');
  });

  it('rejects when the caller is not an org owner/admin', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'organization_members') {
        return makeChain({ data: { role: 'member' }, error: null });
      }
      return makeChain({ data: [], error: null });
    });

    await expect(deleteEquipmentCascade(EQUIP_ID, ORG_ID)).rejects.toThrow(/admin or owner/i);
  });

  it('rejects with a verification message when the membership lookup errors', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'organization_members') {
        return makeChain({ data: null, error: { message: 'network' } });
      }
      return makeChain({ data: [], error: null });
    });

    await expect(deleteEquipmentCascade(EQUIP_ID, ORG_ID)).rejects.toThrow(/verify your permissions/i);
  });

  it('deletes the equipment row last after clearing related data (admin path)', async () => {
    const deleteOrder: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'organization_members') {
        return makeChain({ data: { role: 'owner' }, error: null });
      }
      const chain = makeChain({ data: [], error: null });
      // Record which tables had delete() invoked, in call order.
      chain.delete = vi.fn(() => {
        deleteOrder.push(table);
        return chain;
      });
      return chain;
    });

    await expect(deleteEquipmentCascade(EQUIP_ID, ORG_ID)).resolves.toBeUndefined();

    // No work orders in this fixture, so deleteWorkOrder is never called.
    expect(mockDeleteWorkOrder).not.toHaveBeenCalled();
    // Equipment row must be the final delete.
    expect(deleteOrder[deleteOrder.length - 1]).toBe('equipment');
  });
});
