import { calendarDayToIso, type CalendarDay } from '@/features/work-orders/calendar/dueDate';
import type { CalendarItem } from '@/features/work-orders/calendar/placement';
import type { CalendarRange } from '@/features/work-orders/calendar/url';
import { getStatusColor } from '@/features/work-orders/utils/workOrderHelpers';

export type PrivateCalendarEvent = {
  id: string;
  title: string;
  allDay: boolean;
  start: string;
  end: string;
  editable: boolean;
  classNames: readonly string[];
  placementKind: CalendarItem['placement']['kind'];
};

const POINT_DURATION_MS = 60 * 1000;

function nextCivilDay(day: CalendarDay): CalendarDay {
  const date = new Date(day.y, day.m - 1, day.d + 1);
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

function eventClassNames(item: CalendarItem): string[] {
  const classes = ['eq-cal-event', ...getStatusColor(item.status).split(/\s+/).filter(Boolean)];
  if (item.placement.kind === 'unscheduled') classes.push('eq-cal-unscheduled', 'opacity-60');
  if (item.status === 'cancelled') classes.push('eq-cal-cancelled', 'opacity-60');
  if (item.overdue) classes.push('eq-cal-overdue');
  if (item.editability.kind !== 'editable') classes.push('eq-cal-readonly', 'cursor-not-allowed');
  return classes;
}

function displayTitle(item: CalendarItem): string {
  return item.placement.kind === 'unscheduled' ? `${item.title} · Unscheduled` : item.title;
}

export function toFullCalendarEvent(item: CalendarItem): PrivateCalendarEvent {
  const editable = item.editability.kind === 'editable';
  const classNames = eventClassNames(item);
  const title = displayTitle(item);

  switch (item.placement.kind) {
    case 'unscheduled':
      return {
        id: item.workOrderId,
        title,
        allDay: true,
        start: calendarDayToIso(item.placement.createdOn),
        end: calendarDayToIso(nextCivilDay(item.placement.createdOn)),
        editable,
        classNames,
        placementKind: 'unscheduled',
      };
    case 'dueDay':
      return {
        id: item.workOrderId,
        title,
        allDay: true,
        start: calendarDayToIso(item.placement.day),
        end: calendarDayToIso(nextCivilDay(item.placement.day)),
        editable,
        classNames,
        placementKind: 'dueDay',
      };
    case 'timed': {
      const startMs = item.placement.displayStart.epochMs;
      const dueMs = item.placement.dueAt.epochMs;
      const endMs = dueMs > startMs ? dueMs : startMs + POINT_DURATION_MS;
      return {
        id: item.workOrderId,
        title,
        allDay: false,
        start: new Date(startMs).toISOString(),
        end: new Date(endMs).toISOString(),
        editable,
        classNames,
        placementKind: 'timed',
      };
    }
    default: {
      const _never: never = item.placement;
      return _never;
    }
  }
}

export function rangeToFullCalendarView(
  range: CalendarRange,
): 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' {
  switch (range) {
    case 'month':
      return 'dayGridMonth';
    case 'week':
      return 'timeGridWeek';
    case 'day':
      return 'timeGridDay';
    default: {
      const _never: never = range;
      return _never;
    }
  }
}

export function localeFirstDay(): number {
  try {
    const locale = new Intl.Locale(navigator.language) as Intl.Locale & {
      weekInfo?: { firstDay: number };
      getWeekInfo?: () => { firstDay: number };
    };
    const weekInfo = locale.weekInfo ?? locale.getWeekInfo?.();
    const firstDay = weekInfo?.firstDay;
    if (firstDay === 7) return 0;
    if (firstDay != null && firstDay >= 1 && firstDay <= 6) return firstDay;
  } catch {
    return 0;
  }
  return 0;
}
