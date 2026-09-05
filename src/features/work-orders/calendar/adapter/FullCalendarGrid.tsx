import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calendarDayToIso, type CalendarDay } from '@/features/work-orders/calendar/dueDate';
import type { CalendarIntent } from '@/features/work-orders/calendar/intent';
import type { CalendarItem } from '@/features/work-orders/calendar/placement';
import { shiftCalendarAnchor, type CalendarRange } from '@/features/work-orders/calendar/url';
import { parseFullCalendarIntent } from '@/features/work-orders/calendar/adapter/parseFullCalendar';
import {
  localeFirstDay,
  rangeToFullCalendarView,
  toFullCalendarEvent,
} from '@/features/work-orders/calendar/adapter/toFullCalendar';

export type FullCalendarGridProps = {
  items: readonly CalendarItem[];
  range: CalendarRange;
  anchor: CalendarDay;
  selectedWorkOrderId: string | null;
  onIntent: (intent: CalendarIntent) => void;
  onVisibleAnchorChange: (anchor: CalendarDay) => void;
  onMoreLinkDay: (day: CalendarDay) => void;
};

function civilDayFromDate(date: Date): CalendarDay {
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

function daysEqual(a: CalendarDay, b: CalendarDay): boolean {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

function jumpLabel(range: CalendarRange, direction: 'previous' | 'next'): string {
  switch (range) {
    case 'month':
      return direction === 'previous' ? 'Previous year' : 'Next year';
    case 'week':
      return direction === 'previous' ? 'Previous 4 weeks' : 'Next 4 weeks';
    case 'day':
      return direction === 'previous' ? 'Previous 7 days' : 'Next 7 days';
    default: {
      const _never: never = range;
      return _never;
    }
  }
}

export function FullCalendarGrid({
  items,
  range,
  anchor,
  selectedWorkOrderId,
  onIntent,
  onVisibleAnchorChange,
  onMoreLinkDay,
}: FullCalendarGridProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [viewTitle, setViewTitle] = useState('');
  const [todayDisabled, setTodayDisabled] = useState(false);
  const events = items.map((item) => {
    const event = toFullCalendarEvent(item);
    return {
      ...event,
      classNames: [
        ...event.classNames,
        item.workOrderId === selectedWorkOrderId ? 'eq-cal-selected ring-2 ring-primary' : '',
      ].filter(Boolean),
      extendedProps: { placementKind: event.placementKind },
    };
  });

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const view = rangeToFullCalendarView(range);
    if (api.view.type !== view) {
      api.changeView(view, calendarDayToIso(anchor));
      return;
    }
    const current = civilDayFromDate(api.view.currentStart);
    if (!daysEqual(current, anchor)) {
      api.gotoDate(calendarDayToIso(anchor));
    }
  }, [anchor, range]);

  return (
    <div className="eq-work-order-calendar min-h-[36rem] [&_.fc]:h-full [&_.eq-cal-readonly]:cursor-not-allowed">
      <div className="relative mb-2 flex min-h-9 items-center justify-center">
        <div className="absolute left-0 flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label={jumpLabel(range, 'previous')}
            onClick={() => onVisibleAnchorChange(shiftCalendarAnchor(range, anchor, -1))}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous"
            onClick={() => calendarRef.current?.getApi().prev()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="px-36 text-center text-lg font-semibold">{viewTitle}</h2>
        <div className="absolute right-0 flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={todayDisabled}
            onClick={() => calendarRef.current?.getApi().today()}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Next"
            onClick={() => calendarRef.current?.getApi().next()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label={jumpLabel(range, 'next')}
            onClick={() => onVisibleAnchorChange(shiftCalendarAnchor(range, anchor, 1))}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={rangeToFullCalendarView(range)}
        initialDate={calendarDayToIso(anchor)}
        timeZone="local"
        snapDuration="00:15:00"
        eventDurationEditable={false}
        editable
        selectable
        selectMirror
        dayMaxEvents
        firstDay={localeFirstDay()}
        headerToolbar={false}
        events={events}
        moreLinkClick={(info) => {
          onMoreLinkDay(civilDayFromDate(info.date));
          return 'timeGridDay';
        }}
        dateClick={(info) => {
          const intent = parseFullCalendarIntent(info);
          if (intent) onIntent(intent);
        }}
        select={(info) => {
          const intent = parseFullCalendarIntent(info);
          if (intent) onIntent(intent);
        }}
        eventClick={(info) => {
          const intent = parseFullCalendarIntent(info);
          if (intent) onIntent(intent);
        }}
        eventDrop={(info) => {
          const intent = parseFullCalendarIntent(info);
          if (!intent) {
            info.revert();
            return;
          }
          onIntent(intent);
        }}
        datesSet={(info) => {
          setViewTitle(info.view.title);
          const now = Date.now();
          setTodayDisabled(
            now >= info.view.currentStart.getTime() && now < info.view.currentEnd.getTime(),
          );
          const next = civilDayFromDate(info.view.currentStart);
          if (!daysEqual(next, anchor)) {
            onVisibleAnchorChange(next);
          }
        }}
      />
    </div>
  );
}
