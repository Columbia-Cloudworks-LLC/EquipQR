import { describe, expect, it, vi } from 'vitest';
import { buildWorkOrderStatusActions } from '@/features/work-orders/utils/buildWorkOrderStatusActions';

const noop = vi.fn();

describe('buildWorkOrderStatusActions', () => {
  it('keeps Start Work visible but disabled for accepted work orders without an assignee', () => {
    const actions = buildWorkOrderStatusActions({
      status: 'accepted',
      assigneeId: null,
      canPerformStatusActions: true,
      isManager: true,
      isTechnician: false,
      canComplete: false,
      onStatusChange: noop,
    });

    expect(actions.map((action) => action.label)).toEqual(['Start Work', 'Cancel']);
    expect(actions[0]).toMatchObject({
      label: 'Start Work',
      disabled: true,
      description: 'Select an assignee to enable starting work',
    });
  });

  it('enables Start Work for accepted work orders with an assignee', () => {
    const actions = buildWorkOrderStatusActions({
      status: 'accepted',
      assigneeId: 'user-1',
      canPerformStatusActions: true,
      isManager: true,
      isTechnician: false,
      canComplete: false,
      onStatusChange: noop,
    });

    expect(actions.map((action) => action.label)).toEqual(['Start Work', 'Cancel']);
    expect(actions[0]).toMatchObject({
      label: 'Start Work',
      disabled: false,
      description: 'Begin working on this order',
    });
  });
});
