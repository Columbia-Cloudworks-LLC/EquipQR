import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';

export type CalendarDay = {
  readonly y: number;
  readonly m: number;
  readonly d: number;
};

export type LocalInstant = {
  readonly epochMs: number;
};

export type DueDate =
  | { readonly kind: 'none' }
  | { readonly kind: 'day'; readonly day: CalendarDay }
  | { readonly kind: 'timed'; readonly at: LocalInstant };

export type DueColumns = {
  dueDate?: string | null;
  due_date?: string | null;
  dueDateHasTime?: boolean;
  due_date_has_time?: boolean;
};

export type DueWrite =
  | { readonly op: 'clear' }
  | { readonly op: 'clearTime' }
  | { readonly op: 'setDay'; readonly day: CalendarDay }
  | { readonly op: 'setTimed'; readonly at: LocalInstant }
  | { readonly op: 'moveToDay'; readonly day: CalendarDay }
  | { readonly op: 'moveToInstant'; readonly at: LocalInstant }
  | {
      readonly op: 'scheduleFromUnscheduled';
      readonly target:
        | { readonly kind: 'day'; readonly day: CalendarDay }
        | { readonly kind: 'timed'; readonly at: LocalInstant };
    };

export type DuePersist = {
  readonly dueDate: string | null;
  readonly dueDateHasTime: boolean;
};

export type CalendarPlacement =
  | { readonly kind: 'unscheduled'; readonly createdOn: CalendarDay }
  | { readonly kind: 'dueDay'; readonly day: CalendarDay }
  | {
      readonly kind: 'timed';
      readonly dueAt: LocalInstant;
      readonly displayStart: LocalInstant;
    };

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_HOUR = 60 * 60 * 1000;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function calendarDayToIso(day: CalendarDay): string {
  return `${day.y}-${pad2(day.m)}-${pad2(day.d)}`;
}

export function parseCalendarDay(raw: string): CalendarDay | null {
  const match = ISO_DAY.exec(raw);
  if (!match) return null;

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(y, m - 1, d);
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) {
    return null;
  }

  return { y, m, d };
}

function calendarDayOfInstant(at: LocalInstant): CalendarDay {
  const date = new Date(at.epochMs);
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

export function todayLocal(nowMs: number = Date.now()): CalendarDay {
  return calendarDayOfInstant({ epochMs: nowMs });
}

function rebaseInstantToDay(at: LocalInstant, day: CalendarDay): LocalInstant {
  const date = new Date(at.epochMs);
  return {
    epochMs: new Date(
      day.y,
      day.m - 1,
      day.d,
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    ).getTime(),
  };
}

function firstPresent(a?: string | null, b?: string | null): string | null {
  if (a != null && a !== '') return a;
  if (b != null && b !== '') return b;
  return null;
}

export function parseDue(source: DueColumns): DueDate {
  const raw = firstPresent(source.dueDate, source.due_date);
  if (raw == null) return { kind: 'none' };

  const hasTime = source.dueDateHasTime ?? source.due_date_has_time ?? false;
  const dateOnly = !hasTime ? parseCalendarDay(raw) : null;
  if (dateOnly) return { kind: 'day', day: dateOnly };

  const epochMs = Date.parse(raw);
  if (Number.isNaN(epochMs)) return { kind: 'none' };

  if (hasTime) return { kind: 'timed', at: { epochMs } };

  // Date-only timestamptz: civil day is the viewing browser's calendar, not UTC.
  return { kind: 'day', day: calendarDayOfInstant({ epochMs }) };
}

function applyDayWrite(current: DueDate, day: CalendarDay): DueDate {
  if (current.kind === 'timed') {
    return { kind: 'timed', at: rebaseInstantToDay(current.at, day) };
  }
  return { kind: 'day', day };
}

export function clearTime(current: DueDate): DueDate {
  if (current.kind !== 'timed') return current;
  return { kind: 'day', day: calendarDayOfInstant(current.at) };
}

export function applyDueWrite(current: DueDate, write: DueWrite): DueDate {
  switch (write.op) {
    case 'clear':
      return { kind: 'none' };
    case 'clearTime':
      return clearTime(current);
    case 'setDay':
    case 'moveToDay':
      return applyDayWrite(current, write.day);
    case 'setTimed':
    case 'moveToInstant':
      return { kind: 'timed', at: write.at };
    case 'scheduleFromUnscheduled':
      if (current.kind !== 'none') return current;
      return write.target.kind === 'day'
        ? { kind: 'day', day: write.target.day }
        : { kind: 'timed', at: write.target.at };
    default: {
      const _never: never = write;
      return _never;
    }
  }
}

export function persistDue(due: DueDate): DuePersist {
  switch (due.kind) {
    case 'none':
      return { dueDate: null, dueDateHasTime: false };
    case 'day':
      return { dueDate: calendarDayToIso(due.day), dueDateHasTime: false };
    case 'timed':
      return { dueDate: new Date(due.at.epochMs).toISOString(), dueDateHasTime: true };
    default: {
      const _never: never = due;
      return _never;
    }
  }
}

export function dueDayInputValue(due: DueDate): string {
  switch (due.kind) {
    case 'none':
      return '';
    case 'day':
      return calendarDayToIso(due.day);
    case 'timed':
      return calendarDayToIso(calendarDayOfInstant(due.at));
    default: {
      const _never: never = due;
      return _never;
    }
  }
}

export function dueDayInputWrite(current: DueDate, ymd: string): DueWrite {
  if (ymd === '') return { op: 'clear' };

  const day = parseCalendarDay(ymd);
  if (!day) {
    switch (current.kind) {
      case 'none':
        return { op: 'clear' };
      case 'day':
        return { op: 'setDay', day: current.day };
      case 'timed':
        return { op: 'setDay', day: calendarDayOfInstant(current.at) };
      default: {
        const _never: never = current;
        return _never;
      }
    }
  }

  return { op: 'setDay', day };
}

export function dueDateTimeInputWrite(at: LocalInstant | null): DueWrite {
  return at == null ? { op: 'clearTime' } : { op: 'setTimed', at };
}

export function dueTimeInputValue(due: DueDate): string {
  if (due.kind !== 'timed') return '';
  const date = new Date(due.at.epochMs);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function calendarDayToLocalNoon(day: CalendarDay): Date {
  return new Date(day.y, day.m - 1, day.d, 12, 0, 0, 0);
}

export function formatDueDisplay(
  due: DueDate,
  formatters: {
    formatDay: (value: Date) => string;
    formatTimed: (value: Date) => string;
  },
): string {
  switch (due.kind) {
    case 'none':
      return '';
    case 'day':
      return formatters.formatDay(calendarDayToLocalNoon(due.day));
    case 'timed':
      return formatters.formatTimed(new Date(due.at.epochMs));
    default: {
      const _never: never = due;
      return _never;
    }
  }
}

export function hydrateDueFormFields(source: DueColumns): {
  dueDate: string | undefined;
  dueDateHasTime: boolean;
} {
  const persisted = persistDue(parseDue(source));
  return {
    dueDate: persisted.dueDate ?? undefined,
    dueDateHasTime: persisted.dueDateHasTime,
  };
}

function compareDay(a: CalendarDay, b: CalendarDay): number {
  if (a.y !== b.y) return a.y - b.y;
  if (a.m !== b.m) return a.m - b.m;
  return a.d - b.d;
}

export function isDueOverdue(
  due: DueDate,
  status: WorkOrderStatus,
  nowMs: number = Date.now(),
): boolean {
  if (status === 'completed' || status === 'cancelled') return false;

  switch (due.kind) {
    case 'none':
      return false;
    case 'day':
      return compareDay(due.day, todayLocal(nowMs)) < 0;
    case 'timed':
      return due.at.epochMs < nowMs;
    default: {
      const _never: never = due;
      return _never;
    }
  }
}

export function placeWorkOrder(
  due: DueDate,
  createdOn: CalendarDay,
  estimatedHours: number | null,
): CalendarPlacement {
  switch (due.kind) {
    case 'none':
      return { kind: 'unscheduled', createdOn };
    case 'day':
      return { kind: 'dueDay', day: due.day };
    case 'timed': {
      const displayStart =
        estimatedHours == null || estimatedHours <= 0
          ? due.at
          : { epochMs: due.at.epochMs - estimatedHours * MS_PER_HOUR };
      return { kind: 'timed', dueAt: due.at, displayStart };
    }
    default: {
      const _never: never = due;
      return _never;
    }
  }
}
