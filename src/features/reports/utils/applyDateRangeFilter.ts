/** Minimal shape of a PostgREST filter builder that supports range filters. */
interface RangeFilterable<Q> {
  gte(column: string, value: string): Q;
  lte(column: string, value: string): Q;
}

/**
 * Restricts `query` to rows whose `column` falls inside the optional
 * `dateRange` (inclusive on both ends). Missing bounds are left open.
 */
export function applyDateRangeFilter<Q extends RangeFilterable<Q>>(
  query: Q,
  column: string,
  dateRange?: { from?: string; to?: string } | null,
): Q {
  let filtered = query;
  if (dateRange?.from) {
    filtered = filtered.gte(column, dateRange.from);
  }
  if (dateRange?.to) {
    filtered = filtered.lte(column, dateRange.to);
  }
  return filtered;
}
