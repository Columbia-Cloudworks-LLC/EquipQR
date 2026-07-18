import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { deleteWorkOrderCascade } from './deleteWorkOrderService';

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
  });

  it('calls delete_work_order_cascade RPC', async () => {
    await expect(deleteWorkOrderCascade('wo-1')).resolves.toBeUndefined();

    expect(mockRpc).toHaveBeenCalledWith('delete_work_order_cascade', {
      p_work_order_id: 'wo-1',
    });
  });

  it('throws when RPC returns success false', async () => {
    mockRpc.mockResolvedValue({
      data: { success: false, error: 'Permission denied' },
      error: null,
    });

    await expect(deleteWorkOrderCascade('wo-1')).rejects.toThrow('Permission denied');
  });

  it('throws when RPC transport fails', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    await expect(deleteWorkOrderCascade('wo-1')).rejects.toThrow('Network error');
  });
});

describe('getWorkOrderImageCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns image count from work_order_images', async () => {
    const { getWorkOrderImageCount } = await import('./deleteWorkOrderService');
    mockImageSelect([
      {
        id: 'img-1',
        file_name: 'photo.jpg',
        file_url: 'user-1/wo-1/photo.jpg',
      },
    ]);

    await expect(getWorkOrderImageCount('wo-1')).resolves.toEqual({
      count: 1,
      images: [
        {
          id: 'img-1',
          file_name: 'photo.jpg',
          file_url: 'user-1/wo-1/photo.jpg',
        },
      ],
    });
  });
});
