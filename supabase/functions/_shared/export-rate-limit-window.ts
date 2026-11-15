/**
 * Shared pieces of the export request rate limiters
 * (`work-orders-export-data.ts` and `export-report/rate-limit.ts`).
 */

/** Max exports per user per minute. */
export const EXPORT_USER_LIMIT_PER_MINUTE = 5;

/** Max exports per organization per hour. */
export const EXPORT_ORG_LIMIT_PER_HOUR = 50;

/** ISO timestamps for the start of the per-user (1 minute) and per-organization (1 hour) windows. */
export function exportRateLimitWindowStarts(nowMs: number = Date.now()): {
  oneMinuteAgo: string;
  oneHourAgo: string;
} {
  return {
    oneMinuteAgo: new Date(nowMs - 60 * 1000).toISOString(),
    oneHourAgo: new Date(nowMs - 60 * 60 * 1000).toISOString(),
  };
}

/** Logged when the `export_request_log` table has not been migrated yet and limiting is skipped. */
export function logExportRequestLogMissing(): void {
  console.log("export_request_log table not found, skipping rate limit check");
}
