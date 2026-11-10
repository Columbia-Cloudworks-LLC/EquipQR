/**
 * Hours after adding `delta` to what is typed, falling back to the current
 * meter reading when the field is empty or not a number.
 */
export function applyHoursDelta(value: string, currentHours: number | null | undefined, delta: number): string {
  const typed = Number.parseFloat(value);
  const base = Number.isFinite(typed) ? typed : currentHours ?? 0;
  return String(Math.round((base + delta) * 10) / 10);
}
