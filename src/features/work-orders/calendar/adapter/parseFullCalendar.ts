import type { CalendarDay, LocalInstant } from '@/features/work-orders/calendar/dueDate';
import type { CalendarIntent, CreateDuePrefill } from '@/features/work-orders/calendar/intent';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function readDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string') {
    const epochMs = Date.parse(value);
    return Number.isNaN(epochMs) ? null : new Date(epochMs);
  }
  return null;
}

function civilDay(date: Date): CalendarDay {
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

function instant(date: Date): LocalInstant {
  return { epochMs: date.getTime() };
}

function readEvent(value: unknown): {
  id: string;
  start: Date | null;
  allDay: boolean;
  placementKind: string | null;
} | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id);
  if (!id) return null;
  const extended = isRecord(value.extendedProps) ? value.extendedProps : {};
  return {
    id,
    start: readDate(value.start),
    allDay: value.allDay === true,
    placementKind: readString(extended.placementKind),
  };
}

function createPrefill(date: Date, allDay: boolean): CreateDuePrefill {
  return allDay
    ? { op: 'setDay', day: civilDay(date) }
    : { op: 'setTimed', at: instant(date) };
}

function isMonthView(view: unknown): boolean {
  return isRecord(view) && readString(view.type)?.startsWith('dayGrid') === true;
}

export function parseFullCalendarIntent(payload: unknown): CalendarIntent | null {
  if (!isRecord(payload)) return null;

  if (payload.oldEvent != null || payload.delta != null) {
    const event = readEvent(payload.event);
    const oldEvent = readEvent(payload.oldEvent);
    if (!event?.start) return null;

    const wasUnscheduled =
      oldEvent?.placementKind === 'unscheduled' || event.placementKind === 'unscheduled';
    const asDay = event.allDay || isMonthView(payload.view);

    if (wasUnscheduled) {
      return {
        type: 'reschedule',
        workOrderId: event.id,
        write: {
          op: 'scheduleFromUnscheduled',
          target: asDay
            ? { kind: 'day', day: civilDay(event.start) }
            : { kind: 'timed', at: instant(event.start) },
        },
      };
    }

    return {
      type: 'reschedule',
      workOrderId: event.id,
      write: asDay
        ? { op: 'moveToDay', day: civilDay(event.start) }
        : { op: 'moveToInstant', at: instant(event.start) },
    };
  }

  if (payload.event != null) {
    const event = readEvent(payload.event);
    return event ? { type: 'select', workOrderId: event.id } : null;
  }

  const clicked = readDate(payload.date) ?? readDate(payload.dateStr) ?? readDate(payload.start) ?? readDate(payload.startStr);
  if (!clicked) return null;

  return { type: 'create', prefill: createPrefill(clicked, payload.allDay === true) };
}
