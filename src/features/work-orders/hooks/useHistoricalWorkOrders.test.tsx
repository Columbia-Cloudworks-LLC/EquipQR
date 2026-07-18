import { describe, expect, it } from 'vitest';
import { synthesizeDefaultTimeline, eventsToRpcPayload } from '@/features/work-orders/utils/historicalTimeline';

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
    expect(eventsToRpcPayload(customEvents).at(-1)?.new_status).toBe('completed');
  });
});
