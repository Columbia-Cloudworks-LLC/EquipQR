/**
 * Audit Log Hooks
 * 
 * React Query hooks for fetching and managing audit log data.
 * Used for entity history, organization-wide audit logs, and user activity.
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { auditService } from '@/services/auditService';
import {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogPagination,
  AuditLogTimelineBucket,
  AuditEntityType,
  FormattedAuditEntry,
  ENTITY_TYPE_LABELS,
  ACTION_LABELS,
} from '@/types/audit';
import { useAppToast } from '@/hooks/useAppToast';

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
  entityHistory: (entityType: AuditEntityType, entityId: string) =>
    [...auditQueryKeys.all, 'entity', entityType, entityId] as const,
  organizationLog: (
    orgId: string,
    filters?: AuditLogFilters,
    page?: number,
    pageSize?: number
  ) => [...auditQueryKeys.all, 'organization', orgId, filters, page, pageSize] as const,
  userActivity: (orgId: string, userId: string) =>
    [...auditQueryKeys.all, 'user', orgId, userId] as const,
  recentActivity: (orgId: string) =>
    [...auditQueryKeys.all, 'recent', orgId] as const,
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
// Entity History Hook
// ============================================

/**
 * Hook to fetch audit history for a specific entity
 * Used in History tabs on detail pages
 */
export function useEntityHistory(
  organizationId: string | undefined,
  entityType: AuditEntityType | undefined,
  entityId: string | undefined,
  options?: {
    pageSize?: number;
    enabled?: boolean;
  }
) {
  const pageSize = options?.pageSize ?? 20;
  const enabled = options?.enabled !== false && !!organizationId && !!entityType && !!entityId;

  return useInfiniteQuery({
    queryKey: auditQueryKeys.entityHistory(entityType!, entityId!),
    queryFn: async ({ pageParam = 1 }) => {
      const result = await auditService.getEntityHistory(
        organizationId!,
        entityType!,
        entityId!,
        { page: pageParam, pageSize }
      );
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch entity history');
      }
      
      return {
        ...result.data,
        data: result.data.data.map(formatAuditEntry),
        page: pageParam,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds - audit data changes with entity updates
  });
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
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch audit log');
      }
      
      return {
        ...result.data,
        data: result.data.data.map(formatAuditEntry),
      };
    },
    enabled,
    staleTime: 30 * 1000,
  });

  return query;
}

/**
 * Hook for paginated organization audit log with infinite scroll
 */
export function useOrganizationAuditLogInfinite(
  organizationId: string | undefined,
  filters?: AuditLogFilters,
  options?: {
    pageSize?: number;
    enabled?: boolean;
  }
) {
  const pageSize = options?.pageSize ?? 50;
  const enabled = options?.enabled !== false && !!organizationId;

  return useInfiniteQuery({
    queryKey: auditQueryKeys.organizationLog(organizationId!, filters),
    queryFn: async ({ pageParam = 1 }) => {
      const result = await auditService.getOrganizationAuditLog(
        organizationId!,
        filters,
        { page: pageParam, pageSize }
      );
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch audit log');
      }
      
      return {
        ...result.data,
        data: result.data.data.map(formatAuditEntry),
        page: pageParam,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled,
    staleTime: 30 * 1000,
  });
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

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch audit timeline');
      }

      return result.data;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

// ============================================
// User Activity Hook
// ============================================

/**
 * Hook to fetch activity for a specific user
 */
export function useUserActivity(
  organizationId: string | undefined,
  userId: string | undefined,
  pagination?: AuditLogPagination,
  options?: {
    enabled?: boolean;
  }
) {
  const enabled = options?.enabled !== false && !!organizationId && !!userId;

  return useQuery({
    queryKey: auditQueryKeys.userActivity(organizationId!, userId!),
    queryFn: async () => {
      const result = await auditService.getUserActivity(
        organizationId!,
        userId!,
        pagination
      );
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch user activity');
      }
      
      return {
        ...result.data,
        data: result.data.data.map(formatAuditEntry),
      };
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

// ============================================
// Recent Activity Hook
// ============================================

/**
 * Hook to fetch recent activity for dashboard widgets
 */
export function useRecentActivity(
  organizationId: string | undefined,
  limit: number = 10,
  options?: {
    enabled?: boolean;
  }
) {
  const enabled = options?.enabled !== false && !!organizationId;

  return useQuery({
    queryKey: auditQueryKeys.recentActivity(organizationId!),
    queryFn: async () => {
      const result = await auditService.getRecentActivity(organizationId!, limit);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch recent activity');
      }
      
      return result.data.map(formatAuditEntry);
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute for dashboard widget
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

  const exportToCsv = useCallback(async (
    filters?: AuditLogFilters,
    onProgress?: (progress: { current: number; total: number }) => void
  ) => {
    if (!organizationId) {
      toast({
        title: 'Export Failed',
        description: 'Organization ID is required',
        variant: 'error',
      });
      return;
    }

    try {
      const result = await auditService.exportToCsv(organizationId, filters, onProgress);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Export failed');
      }

      const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: 'Audit log has been exported to CSV',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export audit log',
        variant: 'error',
      });
    }
  }, [organizationId, toast]);

  const exportToJson = useCallback(async (
    filters?: AuditLogFilters,
    onProgress?: (progress: { current: number; total: number }) => void
  ) => {
    if (!organizationId) {
      toast({
        title: 'Export Failed',
        description: 'Organization ID is required',
        variant: 'error',
      });
      return;
    }

    try {
      const result = await auditService.exportToJson(organizationId, filters, onProgress);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Export failed');
      }

      const blob = new Blob([result.data], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: 'Audit log has been exported to JSON',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export audit log',
        variant: 'error',
      });
    }
  }, [organizationId, toast]);

  return { exportToCsv, exportToJson };
}

// ============================================
// Combined Hook for Audit Log Page
// ============================================

/**
 * Combined hook for the Audit Log page with filtering and pagination
 */
export function useAuditLogPage(organizationId: string | undefined) {
  const { exportToCsv } = useAuditExport(organizationId);

  // Memoized filter state helpers
  const createFilters = useCallback((
    entityType?: AuditEntityType | 'all',
    action?: string,
    actorId?: string,
    dateFrom?: string,
    dateTo?: string,
    search?: string
  ): AuditLogFilters => ({
    entityType: entityType === 'all' ? undefined : entityType,
    action: action === 'all' ? undefined : action as AuditLogFilters['action'],
    actorId,
    dateFrom,
    dateTo,
    search,
  }), []);

  return {
    createFilters,
    exportToCsv,
  };
}
