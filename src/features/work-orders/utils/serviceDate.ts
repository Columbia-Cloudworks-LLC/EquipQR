/**
 * Helpers for the "Completed / Service Date" on logged (historical) work orders.
 *
 * Paper sheets carry a calendar day, not a time. The day is stored as an instant
 * that falls on that same calendar day both in the desk's local timezone (what the
 * form shows) and in UTC (what the database casts `completed_date::date` with).
 * Local noon alone is not enough: in UTC+13/+14 it is the previous UTC day. The
 * midpoint between local noon and UTC noon is local 12 + offset/2 and UTC
 * 12 - offset/2, which stays inside the day on both sides for every offset from
 * -12 to +14 hours.
 */

const SERVICE_DATE_HOUR = 12;
const HOUR_MS = 60 * 60 * 1000;

/** The stored instant for a local calendar day; `monthIndex` is 0-based and may overflow like `Date`. */
function serviceDateFor(year: number, monthIndex: number, day: number): Date {
  const localNoon = new Date(year, monthIndex, day, SERVICE_DATE_HOUR, 0, 0, 0);
  const utcNoon = Date.UTC(
    localNoon.getFullYear(),
    localNoon.getMonth(),
    localNoon.getDate(),
    SERVICE_DATE_HOUR,
  );
  // Round to the hour so the stored value stays readable (offsets can be :30/:45).
  const midpoint = Math.round((localNoon.getTime() + utcNoon) / 2 / HOUR_MS) * HOUR_MS;
  return new Date(midpoint);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Today's service date. */
export function todayServiceDate(now: Date = new Date()): Date {
  return serviceDateFor(now.getFullYear(), now.getMonth(), now.getDate());
}

/** The service date `daysAgo` calendar days before today. */
export function serviceDateDaysAgo(daysAgo: number, now: Date = new Date()): Date {
  return serviceDateFor(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
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
  const parsed = serviceDateFor(Number(year), Number(month) - 1, Number(day));
  // Reject overflow such as 2024-02-31 rolling into March.
  if (parsed.getMonth() !== Number(month) - 1 || parsed.getDate() !== Number(day)) return null;
  return parsed;
}

/** True when both dates fall on the same local calendar day. */
export function isSameServiceDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return serviceDateInputValue(a) !== '' && serviceDateInputValue(a) === serviceDateInputValue(b);
}
