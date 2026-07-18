import { beforeEach, describe, expect, it, vi } from 'vitest';
import { workOrderRevertService } from '@/features/work-orders/services/workOrderRevertService';

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('workOrderRevertService.revertPMCompletion', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('reverts PM only when work order is not terminal', async () => {
    rpcMock.mockResolvedValueOnce({
      data: { success: true, old_status: 'completed', new_status: 'pending' },
      error: null,
    });

    const result = await workOrderRevertService.revertPMCompletion('pm-1', {
      reason: 'PM completion reverted by admin',
      workOrderId: 'wo-1',
      workOrderStatus: 'accepted',
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('revert_pm_completion', {
      p_pm_id: 'pm-1',
      p_reason: 'PM completion reverted by admin',
    });
    expect(result).toEqual({
      success: true,
      old_status: 'completed',
      new_status: 'pending',
      work_order_reopened: false,
    });
  });

  it('reopens completed work order after successful PM revert', async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: { success: true, old_status: 'completed', new_status: 'pending' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { success: true, old_status: 'completed', new_status: 'accepted' },
        error: null,
      });

    const result = await workOrderRevertService.revertPMCompletion('pm-1', {
      reason: 'PM completion reverted by admin',
      workOrderId: 'wo-1',
      workOrderStatus: 'completed',
    });

    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock).toHaveBeenNthCalledWith(1, 'revert_pm_completion', {
      p_pm_id: 'pm-1',
      p_reason: 'PM completion reverted by admin',
    });
    expect(rpcMock).toHaveBeenNthCalledWith(2, 'revert_work_order_status', {
      p_work_order_id: 'wo-1',
      p_reason: 'Work order reopened with PM completion revert by admin',
    });
    expect(result).toEqual({
      success: true,
      old_status: 'completed',
      new_status: 'pending',
      work_order_reopened: true,
      work_order_old_status: 'completed',
      work_order_new_status: 'accepted',
    });
  });

  it('reopens cancelled work order after successful PM revert', async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: { success: true, old_status: 'completed', new_status: 'pending' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { success: true, old_status: 'cancelled', new_status: 'accepted' },
        error: null,
      });

    const result = await workOrderRevertService.revertPMCompletion('pm-1', {
      workOrderId: 'wo-1',
      workOrderStatus: 'cancelled',
    });

    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(result.work_order_reopened).toBe(true);
    expect(result.work_order_new_status).toBe('accepted');
  });

  it('returns partial-failure error when PM reverts but work order reopen fails', async () => {
    rpcMock
      .mockResolvedValueOnce({
        data: { success: true, old_status: 'completed', new_status: 'pending' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { success: false, error: 'not authorized' },
        error: null,
      });

    const result = await workOrderRevertService.revertPMCompletion('pm-1', {
      workOrderId: 'wo-1',
      workOrderStatus: 'completed',
    });

    expect(result.success).toBe(false);
    expect(result.new_status).toBe('pending');
    expect(result.work_order_reopened).toBe(false);
    expect(result.error).toMatch(/could not be reopened/i);
  });

  it('keeps string reason overload for callers that do not pass work order context', async () => {
    rpcMock.mockResolvedValueOnce({
      data: { success: true, old_status: 'completed', new_status: 'pending' },
      error: null,
    });

    const result = await workOrderRevertService.revertPMCompletion(
      'pm-1',
      'PM completion reverted by admin',
    );

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(result.work_order_reopened).toBe(false);
  });
});
