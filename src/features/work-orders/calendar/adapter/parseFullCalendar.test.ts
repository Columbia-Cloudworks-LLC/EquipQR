import { describe, expect, it } from 'vitest';
import { parseFullCalendarIntent } from '@/features/work-orders/calendar/adapter/parseFullCalendar';

describe('parseFullCalendarIntent', () => {
  it('maps an event click to select', () => {
    expect(parseFullCalendarIntent({
      event: { id: 'wo-1', title: 'Pump' },
    })).toEqual({ type: 'select', workOrderId: 'wo-1' });
  });

  it('maps an all-day date click to setDay', () => {
    expect(parseFullCalendarIntent({
      date: new Date(2026, 8, 4),
      allDay: true,
    })).toEqual({
      type: 'create',
      prefill: { op: 'setDay', day: { y: 2026, m: 9, d: 4 } },
    });
  });

  it('maps an hour slot click to setTimed', () => {
    const date = new Date(2026, 8, 4, 14, 15, 0, 0);
    expect(parseFullCalendarIntent({
      date,
      allDay: false,
    })).toEqual({
      type: 'create',
      prefill: { op: 'setTimed', at: { epochMs: date.getTime() } },
    });
  });

  it('maps a month drop to moveToDay', () => {
    expect(parseFullCalendarIntent({
      event: { id: 'wo-2', start: new Date(2026, 8, 8), allDay: true },
      oldEvent: { id: 'wo-2', start: new Date(2026, 8, 4), allDay: true },
      view: { type: 'dayGridMonth' },
    })).toEqual({
      type: 'reschedule',
      workOrderId: 'wo-2',
      write: { op: 'moveToDay', day: { y: 2026, m: 9, d: 8 } },
    });
  });

  it('maps a time-slot drop to moveToInstant', () => {
    const start = new Date(2026, 8, 8, 9, 30, 0, 0);
    expect(parseFullCalendarIntent({
      event: { id: 'wo-2', start, allDay: false },
      delta: { milliseconds: 15 * 60 * 1000 },
      view: { type: 'timeGridWeek' },
    })).toEqual({
      type: 'reschedule',
      workOrderId: 'wo-2',
      write: { op: 'moveToInstant', at: { epochMs: start.getTime() } },
    });
  });

  it('maps an unscheduled drop onto a day to scheduleFromUnscheduled', () => {
    expect(parseFullCalendarIntent({
      event: {
        id: 'wo-3',
        start: new Date(2026, 8, 9),
        allDay: true,
        extendedProps: { placementKind: 'unscheduled' },
      },
      oldEvent: {
        id: 'wo-3',
        start: new Date(2026, 0, 10),
        allDay: true,
        extendedProps: { placementKind: 'unscheduled' },
      },
      view: { type: 'dayGridMonth' },
    })).toEqual({
      type: 'reschedule',
      workOrderId: 'wo-3',
      write: {
        op: 'scheduleFromUnscheduled',
        target: { kind: 'day', day: { y: 2026, m: 9, d: 9 } },
      },
    });
  });

  it('returns null for garbage', () => {
    expect(parseFullCalendarIntent(null)).toBeNull();
    expect(parseFullCalendarIntent({})).toBeNull();
    expect(parseFullCalendarIntent('drop')).toBeNull();
  });
});
