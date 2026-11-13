import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildWorkOrderStatusUpdatePayload } from './workOrderUpdatePayload';

const NOW = '2026-03-04T05:06:07.000Z';

describe('buildWorkOrderStatusUpdatePayload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stamps completed_date when completing', () => {
    expect(buildWorkOrderStatusUpdatePayload('completed')).toEqual({
      status: 'completed',
      updated_at: NOW,
      completed_date: NOW,
    });
  });

  it.each(['submitted', 'accepted', 'assigned', 'in_progress'] as const)(
    'clears completed_date when reopening to %s',
    status => {
      expect(buildWorkOrderStatusUpdatePayload(status)).toEqual({
        status,
        updated_at: NOW,
        completed_date: null,
      });
    },
  );

  it.each(['on_hold', 'cancelled'] as const)('leaves completed_date untouched for %s', status => {
    const payload = buildWorkOrderStatusUpdatePayload(status);

    expect(payload).toEqual({ status, updated_at: NOW });
    expect(payload).not.toHaveProperty('completed_date');
  });
});
