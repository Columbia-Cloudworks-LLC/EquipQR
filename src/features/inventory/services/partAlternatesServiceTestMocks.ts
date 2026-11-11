import { vi } from 'vitest';
import type { PostgrestError } from '@supabase/supabase-js';
import type { supabase } from '@/integrations/supabase/client';

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

type RpcResponse = Awaited<ReturnType<typeof supabase.rpc>>;

/**
 * Build a `supabase.rpc` response for `mockResolvedValue`. The generated RPC
 * return types are a union of every function's rows, so test payloads (often
 * partial rows) are accepted as `unknown` and cast once here.
 */
export function rpcResult(data: unknown, error: Pick<PostgrestError, 'message'> & Partial<PostgrestError> | null = null): RpcResponse {
  return {
    data: error ? null : data,
    error,
    count: null,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
    success: error === null,
  } as RpcResponse;
}
