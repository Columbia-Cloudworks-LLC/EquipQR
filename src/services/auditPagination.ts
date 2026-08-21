import type { AuditLogEntry, AuditLogPagination, AuditLogQueryResult } from '@/types/audit';

export function resolveAuditPagination(
  pagination: AuditLogPagination | undefined,
  defaultPageSize: number,
): { page: number; pageSize: number; offset: number } {
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? defaultPageSize;
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

export function buildAuditLogQueryResult(
  data: AuditLogEntry[],
  totalCount: number,
  offset: number,
  pageSize: number,
): AuditLogQueryResult {
  return {
    data,
    totalCount,
    hasMore: offset + pageSize < totalCount,
  };
}
