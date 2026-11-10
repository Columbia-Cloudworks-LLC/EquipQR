/**
 * Helpers for the "Completed / Service Date" on logged (historical) work orders.
 *
 * Paper sheets carry a calendar day, not a time. The day is pinned to local noon
 * so converting to UTC for storage can never shift it onto the previous or next
 * calendar day, whichever timezone the desk is in.
 */

const SERVICE_DATE_HOUR = 12;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Today at local noon. */
export function todayServiceDate(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), SERVICE_DATE_HOUR, 0, 0, 0);
}

/** `daysAgo` calendar days before today, at local noon. */
export function serviceDateDaysAgo(daysAgo: number, now: Date = new Date()): Date {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysAgo,
    SERVICE_DATE_HOUR,
    0,
    0,
    0,
  );
}

/** Value for an `<input type="date">` from a service date (local calendar day). */
export function serviceDateInputValue(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses an `<input type="date">` value into a service date, or null when empty/invalid. */
export function parseServiceDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day), SERVICE_DATE_HOUR, 0, 0, 0);
  // Reject overflow such as 2024-02-31 rolling into March.
  if (parsed.getMonth() !== Number(month) - 1 || parsed.getDate() !== Number(day)) return null;
  return parsed;
}

/** True when both dates fall on the same local calendar day. */
export function isSameServiceDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return serviceDateInputValue(a) !== '' && serviceDateInputValue(a) === serviceDateInputValue(b);
}
