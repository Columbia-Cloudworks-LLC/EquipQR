import { describe, expect, it } from 'vitest';
import { synthesizeDefaultTimeline, eventsToRpcPayload } from '@/features/work-orders/utils/historicalTimeline';
import { historicalDueFollowUp } from '@/features/work-orders/hooks/useHistoricalWorkOrders';

describe('historical work order submission payload', () => {
  it('builds RPC payload from synthesized timeline events when custom events are absent', () => {
    const events = synthesizeDefaultTimeline({
      startDate: new Date('2024-01-01T08:00:00Z'),
      finalStatus: 'cancelled',
      completedDate: new Date('2024-01-02T08:00:00Z'),
    });

    const payload = eventsToRpcPayload(events);
    expect(payload).toEqual([
      expect.objectContaining({ old_status: null, new_status: 'submitted' }),
      expect.objectContaining({ old_status: 'submitted', new_status: 'cancelled' }),
    ]);
  });

  it('preserves explicit custom timeline events for create RPC submission', () => {
    const customEvents = synthesizeDefaultTimeline({
      startDate: new Date('2024-01-01T08:00:00Z'),
      finalStatus: 'completed',
      completedDate: new Date('2024-01-05T16:00:00Z'),
      assigneeId: 'user-1',
    });

    expect(customEvents).toHaveLength(5);
    const payload = eventsToRpcPayload(customEvents);
    expect(payload[payload.length - 1]?.new_status).toBe('completed');
  });
});

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
