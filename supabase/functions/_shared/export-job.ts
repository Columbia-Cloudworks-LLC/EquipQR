/**
 * Shared helpers for the async export job lifecycle (#1193).
 *
 * Flow:
 *   1. Client/edge calls enqueue_export_job (or inserts log + pgmq send)
 *   2. queue-worker drains `exports` → invokes process-export-job
 *   3. Worker marks processing → runs DB RPC → uploads CSV → marks completed
 *   4. Client polls get_export_job_status / export_request_log
 */

export const EXPORTS_QUEUE_NAME = "exports";
export const EXPORT_RESULTS_BUCKET = "export-results";
export const ASYNC_EXPORT_REPORT_TYPES = ["equipment", "work-orders"] as const;

export type AsyncExportReportType = (typeof ASYNC_EXPORT_REPORT_TYPES)[number];

export interface ExportJobMessage {
  export_log_id: string;
  organization_id: string;
  user_id: string;
  report_type: string;
}

export function isAsyncExportReportType(value: string): value is AsyncExportReportType {
  return (ASYNC_EXPORT_REPORT_TYPES as readonly string[]).includes(value);
}

export function parseExportJobMessage(
  payload: Record<string, unknown> | null | undefined,
): ExportJobMessage | null {
  if (!payload) return null;
  const exportLogId = payload.export_log_id;
  const organizationId = payload.organization_id;
  const userId = payload.user_id;
  const reportType = payload.report_type;
  if (
    typeof exportLogId !== "string" ||
    typeof organizationId !== "string" ||
    typeof userId !== "string" ||
    typeof reportType !== "string"
  ) {
    return null;
  }
  return {
    export_log_id: exportLogId,
    organization_id: organizationId,
    user_id: userId,
    report_type: reportType,
  };
}

export function buildExportStoragePath(
  organizationId: string,
  userId: string,
  exportLogId: string,
  extension = "csv",
): string {
  return `${organizationId}/${userId}/${exportLogId}.${extension}`;
}

export function logExportJobStep(
  step: string,
  details?: Record<string, unknown>,
): void {
  console.log(
    JSON.stringify({
      level: "info",
      function: "export-job",
      step,
      ...(details ?? {}),
    }),
  );
}
