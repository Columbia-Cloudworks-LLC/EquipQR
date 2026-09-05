import { describe, expect, it } from 'vitest';
import { calendarEditability } from '@/features/work-orders/calendar/editability';
import {
  applyCalendarDrag,
  toCalendarItem,
  type CalendarWorkOrderSource,
} from '@/features/work-orders/calendar/placement';

const created = '2026-01-10T15:00:00.000Z';

function source(overrides: Partial<CalendarWorkOrderSource> = {}): CalendarWorkOrderSource {
  return {
    id: 'wo-1',
    title: 'Inspect pump',
    status: 'submitted',
    priority: 'medium',
    created_date: created,
    ...overrides,
  };
}

const editable = calendarEditability({
  engineCanEdit: true,
  status: 'submitted',
  isOfflinePending: false,
});

describe('toCalendarItem', () => {
  it('places an unscheduled work order on the created day', () => {
    const item = toCalendarItem(source({ due_date: null }), editable);
    expect(item.workOrderId).toBe('wo-1');
    expect(item.placement).toEqual({
      kind: 'unscheduled',
      createdOn: {
        y: new Date(created).getFullYear(),
        m: new Date(created).getMonth() + 1,
        d: new Date(created).getDate(),
      },
    });
    expect(item.overdue).toBe(false);
  });

  it('places a date-only due on that civil day', () => {
    const item = toCalendarItem(
      source({ dueDate: '2026-03-20', dueDateHasTime: false }),
      editable,
    );
    expect(item.placement).toEqual({ kind: 'dueDay', day: { y: 2026, m: 3, d: 20 } });
  });

  it('uses a point at dueAt when hours are missing', () => {
    const iso = '2026-03-15T18:00:00.000Z';
    const item = toCalendarItem(
      source({ due_date: iso, due_date_has_time: true, estimated_hours: null }),
      editable,
    );
    expect(item.placement).toEqual({
      kind: 'timed',
      dueAt: { epochMs: Date.parse(iso) },
      displayStart: { epochMs: Date.parse(iso) },
    });
  });

  it('carries editability and status onto the item', () => {
    const locked = calendarEditability({
      engineCanEdit: true,
      status: 'completed',
      isOfflinePending: false,
    });
    const item = toCalendarItem(source({ status: 'completed' }), locked);
    expect(item.editability).toEqual({ kind: 'readOnly', reason: 'locked' });
    expect(item.status).toBe('completed');
  });
});

describe('applyCalendarDrag', () => {
  it('rejects when the item is not editable', () => {
    const result = applyCalendarDrag(
      { kind: 'readOnly', reason: 'locked' },
      { kind: 'day', day: { y: 2026, m: 3, d: 1 } },
      { op: 'moveToDay', day: { y: 2026, m: 3, d: 8 } },
    );
    expect(result).toEqual({ kind: 'rejected' });
  });

  it('applies the write when editable', () => {
    const result = applyCalendarDrag(
      editable,
      { kind: 'none' },
      { op: 'scheduleFromUnscheduled', target: { kind: 'day', day: { y: 2026, m: 4, d: 2 } } },
    );
    expect(result).toEqual({
      kind: 'applied',
      due: { kind: 'day', day: { y: 2026, m: 4, d: 2 } },
    });
  });
});
