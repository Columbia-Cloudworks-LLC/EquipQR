import { describe, expect, it } from 'vitest';
import {
  rangeToFullCalendarView,
  toFullCalendarEvent,
} from '@/features/work-orders/calendar/adapter/toFullCalendar';
import type { CalendarItem } from '@/features/work-orders/calendar/placement';

const editableItem = {
  workOrderId: 'wo-1',
  title: 'Inspect pump',
  editability: { kind: 'editable' as const },
  status: 'submitted' as const,
  priority: 'medium' as const,
  overdue: false,
};

describe('toFullCalendarEvent', () => {
  it('maps unscheduled items to a muted all-day event on the created day', () => {
    const item: CalendarItem = {
      ...editableItem,
      placement: { kind: 'unscheduled', createdOn: { y: 2026, m: 1, d: 10 } },
    };
    const event = toFullCalendarEvent(item);
    expect(event).toMatchObject({
      id: 'wo-1',
      title: 'Inspect pump · Unscheduled',
      allDay: true,
      start: '2026-01-10',
      end: '2026-01-11',
      editable: true,
      placementKind: 'unscheduled',
    });
    expect(event.classNames).toContain('eq-cal-unscheduled');
    expect(event.classNames).toContain('opacity-60');
  });

  it('keeps a missing-hours timed item as a point, not a 15-minute bar', () => {
    const dueAt = { epochMs: Date.parse('2026-03-15T18:00:00.000Z') };
    const item: CalendarItem = {
      ...editableItem,
      placement: { kind: 'timed', dueAt, displayStart: dueAt },
    };
    const event = toFullCalendarEvent(item);
    expect(event.allDay).toBe(false);
    expect(event.start).toBe(new Date(dueAt.epochMs).toISOString());
    expect(Date.parse(event.end) - Date.parse(event.start)).toBe(60 * 1000);
  });

  it('disables drag on locked items', () => {
    const item: CalendarItem = {
      ...editableItem,
      editability: { kind: 'readOnly', reason: 'locked' },
      status: 'cancelled',
      placement: { kind: 'dueDay', day: { y: 2026, m: 3, d: 20 } },
    };
    const event = toFullCalendarEvent(item);
    expect(event.editable).toBe(false);
    expect(event.classNames).toContain('cursor-not-allowed');
    expect(event.classNames).toContain('eq-cal-cancelled');
  });
});

describe('rangeToFullCalendarView', () => {
  it('maps EquipQR ranges to FullCalendar views', () => {
    expect(rangeToFullCalendarView('month')).toBe('dayGridMonth');
    expect(rangeToFullCalendarView('week')).toBe('timeGridWeek');
    expect(rangeToFullCalendarView('day')).toBe('timeGridDay');
  });
});
