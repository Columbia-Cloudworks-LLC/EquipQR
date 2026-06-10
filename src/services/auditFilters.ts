import type { AuditLogFilters } from '@/types/audit';

/**
 * Normalize the dateTo filter into an exclusive upper bound for `created_at`.
 */
export function normalizeAuditDateTo(dateTo: string): string {
  if (dateTo.includes('T')) {
    return dateTo;
  }
  const endDate = new Date(dateTo);
  endDate.setDate(endDate.getDate() + 1);
  return endDate.toISOString();
}

export function applyAuditFilters<
  T extends {
    eq: (column: string, value: string) => T;
    gte: (column: string, value: string) => T;
    lt: (column: string, value: string) => T;
    or: (query: string) => T;
  },
>(query: T, filters?: AuditLogFilters): T {
  let filteredQuery = query;

  if (filters?.entityType && filters.entityType !== 'all') {
    filteredQuery = filteredQuery.eq('entity_type', filters.entityType);
  }

  if (filters?.action && filters.action !== 'all') {
    filteredQuery = filteredQuery.eq('action', filters.action);
  }

  if (filters?.actorId) {
    filteredQuery = filteredQuery.eq('actor_id', filters.actorId);
  }

  if (filters?.dateFrom) {
    filteredQuery = filteredQuery.gte('created_at', filters.dateFrom);
  }

  if (filters?.dateTo) {
    filteredQuery = filteredQuery.lt('created_at', normalizeAuditDateTo(filters.dateTo));
  }

  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    filteredQuery = filteredQuery.or(
      `entity_name.ilike.${searchTerm},actor_name.ilike.${searchTerm}`,
    );
  }

  return filteredQuery;
}
