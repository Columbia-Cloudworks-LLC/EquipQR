import {
  calendarDayToIso,
  parseCalendarDay,
  todayLocal,
  type CalendarDay,
} from '@/features/work-orders/calendar/dueDate';

export { parseCalendarDay };
export type { CalendarDay };

export type ListDueBucket = 'overdue';

export type UrlDate =
  | { readonly kind: 'absent' }
  | { readonly kind: 'listBucket'; readonly bucket: ListDueBucket }
  | { readonly kind: 'calendarDay'; readonly day: CalendarDay };

export type CalendarRange = 'day' | 'week' | 'month';

function addCalendarDays(day: CalendarDay, days: number): CalendarDay {
  const date = new Date(day.y, day.m - 1, day.d);
  date.setDate(date.getDate() + days);
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

function addCalendarYears(day: CalendarDay, years: number): CalendarDay {
  const y = day.y + years;
  const lastDay = new Date(y, day.m, 0).getDate();
  return { y, m: day.m, d: Math.min(day.d, lastDay) };
}

export function shiftCalendarAnchor(
  range: CalendarRange,
  anchor: CalendarDay,
  direction: 1 | -1,
): CalendarDay {
  switch (range) {
    case 'month':
      return addCalendarYears(anchor, direction);
    case 'week':
      return addCalendarDays(anchor, direction * 28);
    case 'day':
      return addCalendarDays(anchor, direction * 7);
    default: {
      const _never: never = range;
      return _never;
    }
  }
}

export const WORK_ORDERS_VIEW_MODE_KEY = 'equipqr:work-orders-view-mode' as const;

export type PersistedViewMode = 'list' | 'calendar';

export type WorkOrdersChrome =
  | {
      readonly surface: 'list';
      readonly dueBucket: ListDueBucket | null;
      readonly intendedView: PersistedViewMode;
      readonly range: CalendarRange | null;
      readonly anchor: CalendarDay | null;
      readonly selectedWorkOrderId: string | null;
    }
  | {
      readonly surface: 'calendar';
      readonly range: CalendarRange;
      readonly anchor: CalendarDay;
      readonly selectedWorkOrderId: string | null;
    };

export type ChromePatch = {
  surface?: PersistedViewMode;
  range?: CalendarRange;
  anchor?: CalendarDay;
  selectedWorkOrderId?: string | null;
};

export function parseUrlDate(raw: string | null): UrlDate {
  if (raw == null || raw === '') return { kind: 'absent' };
  if (raw === 'overdue') return { kind: 'listBucket', bucket: 'overdue' };

  const day = parseCalendarDay(raw);
  if (day) return { kind: 'calendarDay', day };

  return { kind: 'absent' };
}

function parseViewMode(raw: string | null): PersistedViewMode | null {
  return raw === 'list' || raw === 'calendar' ? raw : null;
}

function parseRange(raw: string | null): CalendarRange | null {
  return raw === 'day' || raw === 'week' || raw === 'month' ? raw : null;
}

function selectedWorkOrderId(raw: string | null): string | null {
  return raw != null && raw !== '' ? raw : null;
}

export function resolveWorkOrdersChrome(input: {
  urlDate: UrlDate;
  viewParam: string | null;
  rangeParam: string | null;
  woParam: string | null;
  persist: string | null;
  isMobile: boolean;
}): WorkOrdersChrome {
  if (input.urlDate.kind === 'listBucket') {
    return {
      surface: 'list',
      dueBucket: input.urlDate.bucket,
      intendedView: 'list',
      range: null,
      anchor: null,
      selectedWorkOrderId: null,
    };
  }

  const intendedView = parseViewMode(input.viewParam) ?? parseViewMode(input.persist) ?? 'list';
  const inboundRange = parseRange(input.rangeParam);
  const inboundAnchor = input.urlDate.kind === 'calendarDay' ? input.urlDate.day : null;
  const inboundWo = selectedWorkOrderId(input.woParam);

  if (input.isMobile || intendedView === 'list') {
    return {
      surface: 'list',
      dueBucket: null,
      intendedView,
      range: intendedView === 'calendar' ? inboundRange : null,
      anchor: intendedView === 'calendar' ? inboundAnchor : null,
      selectedWorkOrderId: intendedView === 'calendar' ? inboundWo : null,
    };
  }

  return {
    surface: 'calendar',
    range: inboundRange ?? 'month',
    anchor: inboundAnchor ?? todayLocal(),
    selectedWorkOrderId: inboundWo,
  };
}

function applyChromePatch(chrome: WorkOrdersChrome, patch?: ChromePatch): WorkOrdersChrome {
  if (!patch) return chrome;

  const surface = patch.surface ?? chrome.surface;
  const selectedWorkOrderId =
    patch.selectedWorkOrderId !== undefined ? patch.selectedWorkOrderId : chrome.selectedWorkOrderId;

  if (surface === 'list') {
    if (chrome.surface === 'list') {
      return { ...chrome, selectedWorkOrderId };
    }
    return {
      surface: 'list',
      dueBucket: null,
      intendedView: 'list',
      range: null,
      anchor: null,
      selectedWorkOrderId: null,
    };
  }

  const range = patch.range ?? (chrome.surface === 'calendar' ? chrome.range : chrome.range ?? 'month');
  const anchor = patch.anchor ?? (chrome.surface === 'calendar' ? chrome.anchor : chrome.anchor ?? todayLocal());
  return { surface: 'calendar', range, anchor, selectedWorkOrderId };
}

function writeCalendarKeys(
  params: URLSearchParams,
  range: CalendarRange | null,
  anchor: CalendarDay | null,
  workOrderId: string | null,
): void {
  params.set('view', 'calendar');
  if (range) params.set('range', range);
  if (anchor) params.set('date', calendarDayToIso(anchor));
  if (workOrderId) params.set('wo', workOrderId);
}

function deleteCalendarKeys(params: URLSearchParams): void {
  params.delete('view');
  params.delete('range');
  params.delete('wo');
  const date = parseUrlDate(params.get('date'));
  if (date.kind === 'calendarDay') {
    params.delete('date');
  }
}

export function serializeChromeParams(
  chrome: WorkOrdersChrome,
  patch?: ChromePatch,
  current?: URLSearchParams,
): URLSearchParams {
  const next = applyChromePatch(chrome, patch);
  const params = new URLSearchParams(current);

  if (next.surface === 'calendar') {
    writeCalendarKeys(params, next.range, next.anchor, next.selectedWorkOrderId);
    return params;
  }

  if (next.dueBucket) {
    deleteCalendarKeys(params);
    params.set('date', next.dueBucket);
    return params;
  }

  if (next.intendedView === 'calendar') {
    writeCalendarKeys(params, next.range, next.anchor, next.selectedWorkOrderId);
    return params;
  }

  deleteCalendarKeys(params);
  return params;
}
