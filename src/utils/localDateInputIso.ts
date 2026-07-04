function parseDateInputValue(value: string): { yyyy: number; mm: number; dd: number } | null {
  const [yyyy, mm, dd] = value.split('-').map(Number);
  if (!yyyy || !mm || !dd) return null;
  return { yyyy, mm, dd };
}

/** Inclusive start of the selected calendar day in local time, as ISO. */
export function dateInputToLocalStartIso(value: string): string {
  const parts = parseDateInputValue(value);
  if (!parts) return '';
  const { yyyy, mm, dd } = parts;
  return new Date(yyyy, mm - 1, dd, 0, 0, 0, 0).toISOString();
}

/** Inclusive end of the selected calendar day in local time, as ISO. */
export function dateInputToLocalEndIso(value: string): string {
  const parts = parseDateInputValue(value);
  if (!parts) return '';
  const { yyyy, mm, dd } = parts;
  return new Date(yyyy, mm - 1, dd, 23, 59, 59, 999).toISOString();
}

/**
 * Exclusive upper bound for range queries (`created_at < dateTo`):
 * midnight at the start of the day after the selected "To" date in local time.
 */
export function dateInputToExclusiveEndIso(value: string): string {
  const parts = parseDateInputValue(value);
  if (!parts) return '';
  const { yyyy, mm, dd } = parts;
  return new Date(yyyy, mm - 1, dd + 1, 0, 0, 0, 0).toISOString();
}
