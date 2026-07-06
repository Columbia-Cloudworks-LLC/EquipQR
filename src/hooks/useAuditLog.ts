/**
 * Audit Log Hooks
 * 
 * React Query hooks for fetching and managing audit log data.
 * Used for entity history, organization-wide audit logs, and user activity.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { auditService } from '@/services/auditService';
import {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogPagination,
  AuditLogTimelineBucket,
  FormattedAuditEntry,
  ENTITY_TYPE_LABELS,
  ACTION_LABELS,
} from '@/types/audit';
import { useAppToast } from '@/hooks/useAppToast';
import { runAuditExportDownload } from '@/hooks/auditExportDownload';
import {
  AUDIT_QUERY_STALE_MS,
  unwrapAuditResult,
} from '@/hooks/auditLogQueryHelpers';

// ============================================
// Helper Functions
// ============================================

/**
 * Format a raw audit log entry for display
 */
function formatAuditEntry(entry: AuditLogEntry): FormattedAuditEntry {
  const changeCount = Object.keys(entry.changes).length;
  const createdAt = new Date(entry.created_at);

  return {
    ...entry,
    actionLabel: ACTION_LABELS[entry.action] || entry.action,
    entityTypeLabel: ENTITY_TYPE_LABELS[entry.entity_type] || entry.entity_type,
    formattedDate: format(createdAt, 'MMM d, yyyy h:mm a'),
    relativeTime: formatDistanceToNow(createdAt, { addSuffix: true }),
    changeCount,
  };
}

// ============================================
// Query Keys
// ============================================

export const auditQueryKeys = {
  all: ['audit-log'] as const,
  organizationLog: (
    orgId: string,
    filters?: AuditLogFilters,
    page?: number,
    pageSize?: number
  ) => [...auditQueryKeys.all, 'organization', orgId, filters, page, pageSize] as const,
  stats: (orgId: string, dateFrom?: string, dateTo?: string) =>
    [...auditQueryKeys.all, 'stats', orgId, dateFrom, dateTo] as const,
  timeline: (
    orgId: string,
    params: {
      bucket: AuditLogTimelineBucket;
      dateFrom: string;
      dateTo: string;
      filters?: AuditLogFilters;
    }
  ) => [...auditQueryKeys.all, 'timeline', orgId, params] as const,
};

// ============================================
// Timeline Bucket Helper
// ============================================

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

/**
 * Derives the right histogram bucket from a time-range duration. Keeps the
 * histogram readable across vastly different ranges:
 *   <= 1h   -> minute (60 buckets)
 *   <= 24h  -> hour   (24 buckets)
 *   > 24h   -> day    (capped at ~30 buckets for the 30d preset)
 *
 * Whitelist matches the SQL `p_bucket` validator.
 */
export function deriveTimelineBucket(
  dateFrom: string | Date,
  dateTo: string | Date
): AuditLogTimelineBucket {
  const fromMs =
    dateFrom instanceof Date ? dateFrom.getTime() : new Date(dateFrom).getTime();
  const toMs = dateTo instanceof Date ? dateTo.getTime() : new Date(dateTo).getTime();
  const span = Math.max(0, toMs - fromMs);

  if (span <= ONE_HOUR_MS) return 'minute';
  if (span <= ONE_DAY_MS) return 'hour';
  return 'day';
}

// ============================================
// Organization Audit Log Hook
// ============================================

/**
 * Hook to fetch organization-wide audit log with filters
 * Used on the dedicated Audit Log page
 */
export function useOrganizationAuditLog(
  organizationId: string | undefined,
  filters?: AuditLogFilters,
  pagination?: AuditLogPagination,
  options?: {
    enabled?: boolean;
  }
) {
  const enabled = options?.enabled !== false && !!organizationId;

  const query = useQuery({
    queryKey: auditQueryKeys.organizationLog(
      organizationId!,
      filters,
      pagination?.page,
      pagination?.pageSize
    ),
    queryFn: async () => {
      const result = await auditService.getOrganizationAuditLog(
        organizationId!,
        filters,
        pagination
      );
      
      const data = unwrapAuditResult(result, 'Failed to fetch audit log');
      return {
        ...data,
        data: data.data.map(formatAuditEntry),
      };
    },
    enabled,
    staleTime: AUDIT_QUERY_STALE_MS,
  });

  return query;
}

// ============================================
// Timeline Aggregation Hook (issue #641)
// ============================================

/**
 * Hook to fetch time-bucketed audit-event counts for the explorer histogram.
 * Caller is expected to compute `dateFrom` / `dateTo` from a time-range
 * preset and pass a stable `bucket` (use `deriveTimelineBucket` if you want
 * the standard density mapping).
 */
export function useAuditTimeline(
  organizationId: string | undefined,
  params: {
    bucket: AuditLogTimelineBucket;
    dateFrom: string;
    dateTo: string;
    filters?: AuditLogFilters;
  },
  options?: {
    enabled?: boolean;
  }
) {
  const enabled = options?.enabled !== false && !!organizationId;

  return useQuery({
    queryKey: auditQueryKeys.timeline(organizationId!, params),
    queryFn: async () => {
      const result = await auditService.getAuditTimeline(organizationId!, params);

      return unwrapAuditResult(result, 'Failed to fetch audit timeline');
    },
    enabled,
    staleTime: AUDIT_QUERY_STALE_MS,
  });
}

// ============================================
// Audit Stats Hook
// ============================================

/**
 * Hook to fetch audit log statistics
 */
export function useAuditStats(
  organizationId: string | undefined,
  dateFrom?: string,
  dateTo?: string,
  options?: {
    enabled?: boolean;
  }
) {
  const enabled = options?.enabled !== false && !!organizationId;

  return useQuery({
    queryKey: auditQueryKeys.stats(organizationId!, dateFrom, dateTo),
    queryFn: async () => {
      const result = await auditService.getAuditStats(organizationId!, dateFrom, dateTo);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch audit stats');
      }
      
      return result.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes for stats
  });
}

// ============================================
// CSV Export Hook
// ============================================

/**
 * Hook for exporting audit log to CSV
 */
export function useAuditExport(organizationId: string | undefined) {
  const { toast } = useAppToast();

  const exportToCsv = useCallback(
    (filters?: AuditLogFilters, onProgress?: (progress: { current: number; total: number }) => void) =>
      runAuditExportDownload(organizationId, toast, 'csv', filters, onProgress),
    [organizationId, toast],
  );

  const exportToJson = useCallback(
    (filters?: AuditLogFilters, onProgress?: (progress: { current: number; total: number }) => void) =>
      runAuditExportDownload(organizationId, toast, 'json', filters, onProgress),
    [organizationId, toast],
  );

  return { exportToCsv, exportToJson };
}
