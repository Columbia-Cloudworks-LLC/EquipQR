import type { AuditLogEntry } from '@/types/audit';
import type { ApiResponse } from '@/services/base/BaseService';

export const AUDIT_QUERY_STALE_MS = 30 * 1000;

export function unwrapAuditResult<T>(
  result: ApiResponse<T>,
  failureMessage: string,
): T {
  if (!result.success || !result.data) {
    throw new Error(result.error || failureMessage);
  }
  return result.data;
}

export function mapAuditPage<T extends { data: AuditLogEntry[] }, R>(
  page: T,
  pageParam: number,
  formatEntry: (entry: AuditLogEntry) => R,
) {
  return {
    ...page,
    data: page.data.map(formatEntry),
    page: pageParam,
  };
}

export function auditInfiniteNextPage(lastPage: { hasMore: boolean; page: number }) {
  if (lastPage.hasMore) {
    return lastPage.page + 1;
  }
  return undefined;
}
