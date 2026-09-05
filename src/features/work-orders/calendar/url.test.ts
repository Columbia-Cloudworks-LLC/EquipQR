import { describe, expect, it } from 'vitest';
import {
  parseCalendarDay,
  parseUrlDate,
  resolveWorkOrdersChrome,
  serializeChromeParams,
  shiftCalendarAnchor,
  WORK_ORDERS_VIEW_MODE_KEY,
  type CalendarRange,
  type ChromePatch,
  type ListDueBucket,
  type PersistedViewMode,
  type UrlDate,
  type WorkOrdersChrome,
} from '@/features/work-orders/calendar';

describe('WORK_ORDERS_VIEW_MODE_KEY', () => {
  it('matches the cookie-consent allowlist key', () => {
    expect(WORK_ORDERS_VIEW_MODE_KEY).toBe('equipqr:work-orders-view-mode');
  });
});

describe('parseUrlDate', () => {
  it('treats overdue as a list bucket, never a calendar day', () => {
    const overdue: UrlDate = parseUrlDate('overdue');
    const bucket: ListDueBucket = 'overdue';
    expect(overdue).toEqual({ kind: 'listBucket', bucket });
    expect(parseCalendarDay('overdue')).toBeNull();
  });

  it('treats an ISO date as a calendar day', () => {
    expect(parseUrlDate('2026-09-04')).toEqual({
      kind: 'calendarDay',
      day: { y: 2026, m: 9, d: 4 },
    });
    expect(parseCalendarDay('2026-09-04')).toEqual({ y: 2026, m: 9, d: 4 });
  });

  it('maps today and garbage to absent', () => {
    expect(parseUrlDate('today')).toEqual({ kind: 'absent' });
    expect(parseUrlDate('this_week')).toEqual({ kind: 'absent' });
    expect(parseUrlDate('garbage')).toEqual({ kind: 'absent' });
    expect(parseUrlDate(null)).toEqual({ kind: 'absent' });
  });
});

describe('resolveWorkOrdersChrome', () => {
  it('keeps phones on the list while serialize preserves inbound calendar keys', () => {
    const persist: PersistedViewMode = 'list';
    const range: CalendarRange = 'week';
    const chrome: WorkOrdersChrome = resolveWorkOrdersChrome({
      urlDate: parseUrlDate('2026-09-04'),
      viewParam: 'calendar',
      rangeParam: range,
      woParam: 'wo-1',
      persist,
      isMobile: true,
    });

    expect(chrome.surface).toBe('list');

    const patch: ChromePatch = {};
    const params = serializeChromeParams(chrome, patch);
    expect(params.get('view')).toBe('calendar');
    expect(params.get('range')).toBe('week');
    expect(params.get('date')).toBe('2026-09-04');
    expect(params.get('wo')).toBe('wo-1');
  });

  it('keeps team and sort keys when writing calendar chrome', () => {
    const current = new URLSearchParams('team=all&sort=due_date:asc');
    const chrome = resolveWorkOrdersChrome({
      urlDate: parseUrlDate('2026-09-04'),
      viewParam: 'calendar',
      rangeParam: 'month',
      woParam: null,
      persist: null,
      isMobile: false,
    });

    const params = serializeChromeParams(chrome, undefined, current);
    expect(params.get('team')).toBe('all');
    expect(params.get('sort')).toBe('due_date:asc');
    expect(params.get('view')).toBe('calendar');
    expect(params.get('date')).toBe('2026-09-04');
  });

  it('lets a list bucket win over a persisted calendar view', () => {
    const chrome = resolveWorkOrdersChrome({
      urlDate: parseUrlDate('overdue'),
      viewParam: null,
      rangeParam: null,
      woParam: null,
      persist: 'calendar',
      isMobile: false,
    });

    expect(chrome).toEqual(expect.objectContaining({
      surface: 'list',
      dueBucket: 'overdue',
    }));

    const params = serializeChromeParams(chrome);
    expect(params.get('date')).toBe('overdue');
    expect(params.get('view')).toBeNull();
  });
});

describe('shiftCalendarAnchor', () => {
  it('jumps a year in month view, four weeks in week view, and seven days in day view', () => {
    expect(shiftCalendarAnchor('month', { y: 2026, m: 9, d: 1 }, 1)).toEqual({ y: 2027, m: 9, d: 1 });
    expect(shiftCalendarAnchor('month', { y: 2026, m: 9, d: 1 }, -1)).toEqual({ y: 2025, m: 9, d: 1 });
    expect(shiftCalendarAnchor('week', { y: 2026, m: 9, d: 6 }, 1)).toEqual({ y: 2026, m: 10, d: 4 });
    expect(shiftCalendarAnchor('week', { y: 2026, m: 9, d: 6 }, -1)).toEqual({ y: 2026, m: 8, d: 9 });
    expect(shiftCalendarAnchor('day', { y: 2026, m: 9, d: 4 }, 1)).toEqual({ y: 2026, m: 9, d: 11 });
    expect(shiftCalendarAnchor('day', { y: 2026, m: 9, d: 4 }, -1)).toEqual({ y: 2026, m: 8, d: 28 });
  });

  it('keeps February 29 on a leap-year landing and clamps when the next year is common', () => {
    expect(shiftCalendarAnchor('month', { y: 2024, m: 2, d: 29 }, 1)).toEqual({ y: 2025, m: 2, d: 28 });
    expect(shiftCalendarAnchor('month', { y: 2023, m: 2, d: 28 }, 1)).toEqual({ y: 2024, m: 2, d: 28 });
  });
});
