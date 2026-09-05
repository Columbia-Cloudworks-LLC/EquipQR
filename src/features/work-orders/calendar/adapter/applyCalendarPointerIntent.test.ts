import { describe, expect, it, vi } from 'vitest';
import { applyCalendarPointerIntent } from '@/features/work-orders/calendar/adapter/applyCalendarPointerIntent';

describe('applyCalendarPointerIntent', () => {
  it('opens create from a date click and clears the select-mirror selection', () => {
    const unselect = vi.fn();
    const onIntent = vi.fn();

    applyCalendarPointerIntent(
      { unselect },
      { date: new Date(2026, 8, 10), allDay: true },
      onIntent,
    );

    expect(onIntent).toHaveBeenCalledWith({
      type: 'create',
      prefill: { op: 'setDay', day: { y: 2026, m: 9, d: 10 } },
    });
    expect(unselect).toHaveBeenCalledOnce();
  });

  it('clears the leftover selection even when the payload is not an intent', () => {
    const unselect = vi.fn();
    const onIntent = vi.fn();

    applyCalendarPointerIntent({ unselect }, {}, onIntent);

    expect(onIntent).not.toHaveBeenCalled();
    expect(unselect).toHaveBeenCalledOnce();
  });
});
