import { describe, expect, it } from 'vitest';
import {
  applyDueWrite,
  clearTime,
  dueDateTimeInputWrite,
  dueDayInputValue,
  dueDayInputWrite,
  dueTimeInputValue,
  formatDueDisplay,
  hydrateDueFormFields,
  isDueOverdue,
  parseDue,
  persistDue,
  placeWorkOrder,
  type CalendarDay,
  type CalendarPlacement,
  type DueColumns,
  type DueDate,
  type DuePersist,
  type DueWrite,
} from '@/features/work-orders/calendar';
import type { LocalInstant } from '@/features/work-orders/calendar/dueDate';

function localYmd(date: Date): { y: number; m: number; d: number } {
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function localInstant(y: number, m: number, d: number, h: number, min: number): LocalInstant {
  return { epochMs: new Date(y, m - 1, d, h, min, 0, 0).getTime() };
}

describe('parseDue', () => {
  it('maps a null due to none and ignores a leftover has_time flag', () => {
    const columns: DueColumns = { dueDate: null };
    expect(parseDue(columns)).toEqual({ kind: 'none' });
    expect(parseDue({ due_date: null, due_date_has_time: true })).toEqual({ kind: 'none' });
  });

  it('maps has_time false to a local calendar day, not a UTC ISO split', () => {
    const utcMidnight = '2026-07-15T00:00:00.000Z';
    const parsed = parseDue({ dueDate: utcMidnight, dueDateHasTime: false });
    const local = new Date(utcMidnight);
    expect(parsed).toEqual({ kind: 'day', day: localYmd(local) });

    const utcSplit = utcMidnight.slice(0, 10);
    const localIso = `${local.getFullYear()}-${pad2(local.getMonth() + 1)}-${pad2(local.getDate())}`;
    if (localIso !== utcSplit && parsed.kind === 'day') {
      expect(`${parsed.day.y}-${pad2(parsed.day.m)}-${pad2(parsed.day.d)}`).not.toBe(utcSplit);
    }
  });

  it('maps has_time true to timed', () => {
    const iso = '2026-07-15T18:30:00.000Z';
    expect(parseDue({ due_date: iso, due_date_has_time: true })).toEqual({
      kind: 'timed',
      at: { epochMs: Date.parse(iso) },
    });
  });
});

describe('setDay / dueDayInputWrite keep a timed local clock', () => {
  const timed: DueDate = { kind: 'timed', at: localInstant(2026, 3, 15, 14, 30) };

  it('rebases the civil day and keeps hours and minutes', () => {
    const write: DueWrite = dueDayInputWrite(timed, '2026-03-20');
    const day: CalendarDay = { y: 2026, m: 3, d: 20 };
    expect(write).toEqual({ op: 'setDay', day });

    const next = applyDueWrite(timed, write);
    expect(next.kind).toBe('timed');
    if (next.kind !== 'timed') return;

    const nextDate = new Date(next.at.epochMs);
    expect(nextDate.getFullYear()).toBe(2026);
    expect(nextDate.getMonth()).toBe(2);
    expect(nextDate.getDate()).toBe(20);
    expect(nextDate.getHours()).toBe(14);
    expect(nextDate.getMinutes()).toBe(30);
  });
});

describe('clearTime', () => {
  it('is the only write that strips a timed due to date-only', () => {
    const timed: DueDate = { kind: 'timed', at: localInstant(2026, 3, 15, 14, 30) };
    const day = { y: 2026, m: 8, d: 1 };

    expect(applyDueWrite(timed, { op: 'setDay', day }).kind).toBe('timed');
    expect(applyDueWrite(timed, { op: 'moveToDay', day }).kind).toBe('timed');
    expect(dueDayInputWrite(timed, '2026-08-01')).toEqual({ op: 'setDay', day });

    const stripped = clearTime(timed);
    expect(stripped).toEqual({ kind: 'day', day: { y: 2026, m: 3, d: 15 } });
    expect(dueDateTimeInputWrite(null)).toEqual({ op: 'clearTime' });
    expect(dueDayInputValue(timed)).toBe('2026-03-15');
    expect(dueDayInputValue({ kind: 'none' })).toBe('');
  });
});

describe('dueTimeInputValue', () => {
  it('is empty unless the due is timed', () => {
    expect(dueTimeInputValue({ kind: 'none' })).toBe('');
    expect(dueTimeInputValue({ kind: 'day', day: { y: 2026, m: 3, d: 15 } })).toBe('');
    expect(dueTimeInputValue({ kind: 'timed', at: localInstant(2026, 3, 15, 14, 5) })).toBe('14:05');
  });
});

describe('hydrateDueFormFields', () => {
  it('does not UTC-strip an all-day timestamptz', () => {
    const utcMidnight = '2026-07-15T00:00:00.000Z';
    const fields = hydrateDueFormFields({ dueDate: utcMidnight, dueDateHasTime: false });
    const local = new Date(utcMidnight);
    const localIso = `${local.getFullYear()}-${pad2(local.getMonth() + 1)}-${pad2(local.getDate())}`;
    expect(fields).toEqual({ dueDate: localIso, dueDateHasTime: false });

    const utcSplit = utcMidnight.slice(0, 10);
    if (localIso !== utcSplit) {
      expect(fields.dueDate).not.toBe(utcSplit);
    }
  });

  it('keeps a timed ISO and sets the flag', () => {
    const iso = '2026-07-15T18:30:00.000Z';
    expect(hydrateDueFormFields({ dueDate: iso, dueDateHasTime: true })).toEqual({
      dueDate: iso,
      dueDateHasTime: true,
    });
  });
});

describe('formatDueDisplay', () => {
  it('formats a day without a clock and a timed due with one', () => {
    const formatDay = (value: Date) =>
      `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
    const formatTimed = (value: Date) =>
      `${formatDay(value)} ${pad2(value.getHours())}:${pad2(value.getMinutes())}`;

    expect(
      formatDueDisplay({ kind: 'day', day: { y: 2026, m: 9, d: 4 } }, { formatDay, formatTimed }),
    ).toBe('2026-09-04');
    expect(
      formatDueDisplay({ kind: 'timed', at: localInstant(2026, 9, 4, 11, 0) }, { formatDay, formatTimed }),
    ).toBe('2026-09-04 11:00');
  });
});

describe('persistDue', () => {
  it('always writes dueDate and dueDateHasTime together', () => {
    const none: DuePersist = persistDue({ kind: 'none' });
    expect(none).toEqual({ dueDate: null, dueDateHasTime: false });
    expect(persistDue({ kind: 'day', day: { y: 2026, m: 3, d: 5 } })).toEqual({
      dueDate: '2026-03-05',
      dueDateHasTime: false,
    });

    const epochMs = Date.parse('2026-03-05T18:30:00.000Z');
    expect(persistDue({ kind: 'timed', at: { epochMs } })).toEqual({
      dueDate: '2026-03-05T18:30:00.000Z',
      dueDateHasTime: true,
    });
  });
});

describe('isDueOverdue', () => {
  const now = Date.parse('2026-09-04T15:00:00.000Z');
  const today = localYmd(new Date(now));
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localYmd(yesterdayDate);

  it('treats a date-only due as overdue only after the local end of that day', () => {
    expect(isDueOverdue({ kind: 'day', day: yesterday }, 'submitted', now)).toBe(true);
    expect(isDueOverdue({ kind: 'day', day: today }, 'submitted', now)).toBe(false);
  });

  it('compares a timed due against now', () => {
    expect(isDueOverdue({ kind: 'timed', at: { epochMs: now - 1 } }, 'in_progress', now)).toBe(true);
    expect(isDueOverdue({ kind: 'timed', at: { epochMs: now + 1 } }, 'in_progress', now)).toBe(false);
  });

  it('never marks a completed work order overdue', () => {
    expect(isDueOverdue({ kind: 'day', day: yesterday }, 'completed', now)).toBe(false);
    expect(isDueOverdue({ kind: 'timed', at: { epochMs: now - 1 } }, 'completed', now)).toBe(false);
    expect(isDueOverdue({ kind: 'none' }, 'submitted', now)).toBe(false);
  });
});

describe('placeWorkOrder', () => {
  const createdOn = { y: 2026, m: 1, d: 10 };

  it('places an unschedulable due on the created day', () => {
    const placement: CalendarPlacement = placeWorkOrder({ kind: 'none' }, createdOn, null);
    expect(placement).toEqual({
      kind: 'unscheduled',
      createdOn,
    });
  });

  it('uses the due instant as a point when hours are missing', () => {
    const dueAt = { epochMs: Date.parse('2026-03-15T18:00:00.000Z') };
    expect(placeWorkOrder({ kind: 'timed', at: dueAt }, createdOn, null)).toEqual({
      kind: 'timed',
      dueAt,
      displayStart: dueAt,
    });
  });
});
