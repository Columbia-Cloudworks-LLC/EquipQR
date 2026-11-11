import { describe, expect, it } from 'vitest';
import { historicalDueFollowUp } from '@/features/work-orders/hooks/useHistoricalWorkOrders';

describe('historicalDueFollowUp', () => {
  it('is null when the historical create is all-day or has no due', () => {
    expect(historicalDueFollowUp({ dueDate: '2026-01-10', dueDateHasTime: false })).toBeNull();
    expect(historicalDueFollowUp({ dueDateHasTime: true })).toBeNull();
  });

  it('rewrites a timed due so the RPC default cannot leave the flag false', () => {
    const epochMs = new Date(2026, 0, 10, 14, 30).getTime();
    expect(historicalDueFollowUp({
      dueDate: new Date(epochMs).toISOString(),
      dueDateHasTime: true,
    })).toEqual({
      dueDate: new Date(epochMs).toISOString(),
      dueDateHasTime: true,
    });
  });
});
