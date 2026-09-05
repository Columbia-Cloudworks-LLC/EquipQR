import { parseFullCalendarIntent } from '@/features/work-orders/calendar/adapter/parseFullCalendar';
import type { CalendarIntent } from '@/features/work-orders/calendar/intent';

type UnselectableCalendar = {
  unselect: () => void;
};

export function applyCalendarPointerIntent(
  calendar: UnselectableCalendar,
  payload: unknown,
  onIntent: (intent: CalendarIntent) => void,
): void {
  const intent = parseFullCalendarIntent(payload);
  if (intent) onIntent(intent);
  calendar.unselect();
}
