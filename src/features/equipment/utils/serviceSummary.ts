const DAY_MS = 24 * 60 * 60 * 1000;

/** "today", "yesterday", "12 days ago" — whole local calendar days between two instants. */
export function formatDaysAgo(completedAt: Date, now: Date = new Date()): string {
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.max(0, Math.round((startOfDay(now) - startOfDay(completedAt)) / DAY_MS));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days.toLocaleString()} days ago`;
}

/**
 * Text for the badge, e.g. `Last PM: 12 days ago • 1,240 hrs`.
 * Returns null when the completion date cannot be read.
 */
export function buildServiceSummaryText(
  completedAt: string,
  hoursAtCompletion: number | null | undefined,
  now: Date = new Date(),
): string | null {
  const completed = new Date(completedAt);
  if (Number.isNaN(completed.getTime())) return null;
  const hours =
    hoursAtCompletion != null ? ` • ${hoursAtCompletion.toLocaleString()} hrs` : '';
  return `Last PM: ${formatDaysAgo(completed, now)}${hours}`;
}
