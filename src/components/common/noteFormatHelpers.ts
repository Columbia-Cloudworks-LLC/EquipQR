/** Format labor hours for note list metadata (empty when zero/invalid). */
export function formatNoteHoursWorked(hours: number | null | undefined): string {
  const numHours = Number(hours) || 0;
  return numHours > 0 ? `${numHours}h` : '';
}

/** Format machine hours for note list metadata (empty when zero/invalid). */
export function formatNoteMachineHours(hours: number | null | undefined): string {
  const n = Number(hours);
  return Number.isFinite(n) && n > 0 ? `${n}h` : '';
}
