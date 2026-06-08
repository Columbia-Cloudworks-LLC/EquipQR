import type { AuditLogPagination, AuditLogQueryResult } from '@/types/audit';

export function resolveAuditPagination(
  pagination: AuditLogPagination | undefined,
  defaultPageSize: number,
): { page: number; pageSize: number; offset: number } {
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? defaultPageSize;
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

export function buildAuditLogQueryResult<T extends { created_at: string }>(
  data: T[],
  totalCount: number,
  offset: number,
  pageSize: number,
): AuditLogQueryResult {
  return {
    data: data as AuditLogQueryResult['data'],
    totalCount,
    hasMore: offset + pageSize < totalCount,
  };
}
