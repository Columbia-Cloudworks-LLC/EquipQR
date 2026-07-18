import { vi } from 'vitest';

export const mockSelect = vi.fn();
export const mockInsert = vi.fn();
export const mockUpdate = vi.fn();
export const mockDelete = vi.fn();
export const mockEq = vi.fn();
export const mockIn = vi.fn();
export const mockIlike = vi.fn();
export const mockOrder = vi.fn();
export const mockLimit = vi.fn();
export const mockSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: 'user-1' } }, error: null }),
    },
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

export function resetPartAlternatesMockChain(): void {
  mockSelect.mockReturnValue({ eq: mockEq, in: mockIn });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockDelete.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ eq: mockEq, single: mockSingle, order: mockOrder });
  mockIn.mockResolvedValue({ data: [], error: null });
  mockOrder.mockReturnValue({ order: mockOrder, limit: mockLimit, data: [], error: null });
  mockLimit.mockReturnValue({ data: [], error: null });
  mockSingle.mockReturnValue({ data: null, error: null });
  mockIlike.mockReturnValue({ order: mockOrder });
}
