import type { PaginationParams } from '@/services/base/BaseService';

/** Applies page/limit range to a Supabase query builder when `pagination.limit` is set. */
export function applySupabasePaginationRange<T extends { range: (from: number, to: number) => T }>(
  query: T,
  pagination: PaginationParams,
): T {
  if (!pagination.limit) {
    return query;
  }
  const startIndex = ((pagination.page || 1) - 1) * pagination.limit;
  return query.range(startIndex, startIndex + pagination.limit - 1);
}
