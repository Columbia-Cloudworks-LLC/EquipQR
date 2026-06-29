import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockRpc, mockStorageRemove } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockStorageRemove: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    storage: {
      from: () => ({
        remove: (...removeArgs: unknown[]) => mockStorageRemove(...removeArgs),
      }),
    },
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { deleteWorkOrderCascade } from '../deleteWorkOrderService';

function mockImageSelect(data: Array<{ id: string; file_name: string; file_url: string }>) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data, error: null }),
    }),
  });
}

describe('deleteWorkOrderCascade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: { success: true, work_order_id: 'wo-1', organization_id: 'org-1' },
      error: null,
    });
    mockStorageRemove.mockResolvedValue({ error: null });
  });

  it('cleans up storage then calls delete_work_order_cascade RPC', async () => {
    mockImageSelect([
      {
        id: 'img-1',
        file_name: 'photo.jpg',
        file_url: 'https://example.test/storage/v1/object/public/work-order-images/user-1/photo.jpg',
      },
    ]);

    await expect(deleteWorkOrderCascade('wo-1')).resolves.toBeUndefined();

    expect(mockStorageRemove).toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledWith('delete_work_order_cascade', {
      p_work_order_id: 'wo-1',
    });
  });

  it('throws when RPC returns success false', async () => {
    mockImageSelect([]);
    mockRpc.mockResolvedValue({
      data: { success: false, error: 'Permission denied' },
      error: null,
    });

    await expect(deleteWorkOrderCascade('wo-1')).rejects.toThrow('Permission denied');
  });

  it('throws when RPC transport fails', async () => {
    mockImageSelect([]);
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    await expect(deleteWorkOrderCascade('wo-1')).rejects.toThrow('Network error');
  });
});
