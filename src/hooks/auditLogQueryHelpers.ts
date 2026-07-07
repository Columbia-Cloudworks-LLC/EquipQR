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
