/**
 * Audit Service
 * 
 * Provides methods to query audit log entries for compliance tracking,
 * entity history, and user activity reporting.
 */

import { supabase } from '@/integrations/supabase/client';
import { formatIsoZulu } from '@/utils/dateFormatter';
import { logger } from '@/utils/logger';
import { buildAuditLogQueryResult, resolveAuditPagination } from '@/services/auditPagination';
import { fetchAuditLogPage } from '@/services/auditLogPageQuery';
import { applyAuditFilters, normalizeAuditDateTo } from '@/services/auditFilters';
import type { ApiResponse } from '@/services/base/BaseService';
import {
  fetchAuditLogExportEntries,
  logAuditExportNotification,
} from '@/services/auditExportPagination';
import {
  createServiceErrorResponse,
  createServiceSuccessResponse,
} from '@/services/serviceResponseHelpers';
import {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogPagination,
  AuditLogQueryResult,
  AuditEntityType,
  AuditAction,
  AuditLogCsvRow,
  AuditLogTimelineBucket,
  AuditLogTimelineRow,
  ENTITY_TYPE_LABELS,
  ACTION_LABELS,
  FIELD_LABELS,
  AuditChanges,
} from '@/types/audit';

// ============================================
// Constants
// ============================================

type ServiceResponse<T> = ApiResponse<T>;

/**
 * Format changes object into a human-readable description
 */
function formatChangesDescription(changes: AuditChanges): string {
  const descriptions: string[] = [];
  
  for (const [field, change] of Object.entries(changes)) {
    const fieldLabel = FIELD_LABELS[field] || field;
    
    if (change.old === null && change.new !== null) {
      descriptions.push(`${fieldLabel}: set to "${change.new}"`);
    } else if (change.old !== null && change.new === null) {
      descriptions.push(`${fieldLabel}: removed (was "${change.old}")`);
    } else if (change.old !== change.new) {
      descriptions.push(`${fieldLabel}: "${change.old}" → "${change.new}"`);
    }
  }
  
  return descriptions.join('; ') || 'No changes recorded';
}

/**
 * Convert audit entries to CSV format.
 * Timestamps are emitted as ISO-8601 Zulu (UTC) for compliance exports — not
 * browser-local `toLocale*` rendering.
 */
function convertToCsvRows(entries: AuditLogEntry[]): AuditLogCsvRow[] {
  return entries.map(entry => {
    const timestampUtc = formatIsoZulu(entry.created_at);
    return {
      date: timestampUtc,
      time: '',
      entityType: ENTITY_TYPE_LABELS[entry.entity_type] || entry.entity_type,
      entityName: entry.entity_name || 'Unknown',
      action: ACTION_LABELS[entry.action] || entry.action,
      changedBy: entry.actor_name,
      changedByEmail: entry.actor_email || '',
      changesDescription: formatChangesDescription(entry.changes),
    };
  });
}

/**
 * Generate CSV string from rows
 */
function generateCsvString(rows: AuditLogCsvRow[]): string {
  const headers = [
    'Timestamp (UTC)',
    'Entity Type',
    'Entity Name',
    'Action',
    'Changed By',
    'Email',
    'Changes',
  ];
  
  const csvRows = rows.map(row => [
    row.date,
    row.entityType,
    `"${row.entityName.replace(/"/g, '""')}"`,
    row.action,
    `"${row.changedBy.replace(/"/g, '""')}"`,
    row.changedByEmail,
    `"${row.changesDescription.replace(/"/g, '""')}"`,
  ].join(','));
  
  return [headers.join(','), ...csvRows].join('\n');
}

// ============================================
// Audit Service
// ============================================

export const auditService = {
  /**
   * Get audit history for a specific entity
   */
  async getEntityHistory(
    organizationId: string,
    entityType: AuditEntityType,
    entityId: string,
    pagination?: AuditLogPagination
  ): Promise<ServiceResponse<AuditLogQueryResult>> {
    try {
      const page = await fetchAuditLogPage(
        organizationId,
        { entity_type: entityType, entity_id: entityId },
        pagination,
        20,
      );
      return createServiceSuccessResponse(page);
    } catch (error) {
      return createServiceErrorResponse(error, 'AuditService error');
    }
  },

  /**
   * Get organization-wide audit log with filters
   */
  async getOrganizationAuditLog(
    organizationId: string,
    filters?: AuditLogFilters,
    pagination?: AuditLogPagination
  ): Promise<ServiceResponse<AuditLogQueryResult>> {
    try {
      const { pageSize, offset } = resolveAuditPagination(pagination, 50);
      
      // Build query
      let query = supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId);
      
      // Apply filters
      if (filters?.entityType && filters.entityType !== 'all') {
        query = query.eq('entity_type', filters.entityType);
      }
      
      if (filters?.action && filters.action !== 'all') {
        query = query.eq('action', filters.action);
      }
      
      if (filters?.actorId) {
        query = query.eq('actor_id', filters.actorId);
      }
      
      if (filters?.entityId) {
        query = query.eq('entity_id', filters.entityId);
      }
      
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        query = query.lt('created_at', normalizeAuditDateTo(filters.dateTo));
      }
      
      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`entity_name.ilike.${searchTerm},actor_name.ilike.${searchTerm}`);
      }
      
      // Apply pagination and ordering
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return createServiceSuccessResponse(
        buildAuditLogQueryResult(data as AuditLogEntry[], count ?? 0, offset, pageSize),
      );
    } catch (error) {
      return createServiceErrorResponse(error, 'AuditService error');
    }
  },

  /**
   * Get activity for a specific user
   */
  async getUserActivity(
    organizationId: string,
    userId: string,
    pagination?: AuditLogPagination
  ): Promise<ServiceResponse<AuditLogQueryResult>> {
    try {
      const page = await fetchAuditLogPage(
        organizationId,
        { actor_id: userId },
        pagination,
        20,
      );
      return createServiceSuccessResponse(page);
    } catch (error) {
      return createServiceErrorResponse(error, 'AuditService error');
    }
  },

  /**
   * Get recent activity for the organization (for dashboard widgets)
   */
  async getRecentActivity(
    organizationId: string,
    limit: number = 10
  ): Promise<ServiceResponse<AuditLogEntry[]>> {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return createServiceSuccessResponse(data as AuditLogEntry[]);
    } catch (error) {
      return createServiceErrorResponse(error, 'AuditService error');
    }
  },

  /**
   * Export audit log to CSV
   */
  async exportToCsv(
    organizationId: string,
    filters?: AuditLogFilters,
    onProgress?: (progress: { current: number; total: number }) => void
  ): Promise<ServiceResponse<string>> {
    try {
      const allEntries = await fetchAuditLogExportEntries({
        organizationId,
        filters,
        select:
          'id, created_at, entity_type, entity_name, action, actor_name, actor_email, changes',
        onProgress,
      });

      await logAuditExportNotification(organizationId, allEntries.length);

      const csvRows = convertToCsvRows(allEntries);
      const csvString = generateCsvString(csvRows);
      
      return createServiceSuccessResponse(csvString);
    } catch (error) {
      return createServiceErrorResponse(error, 'AuditService error');
    }
  },

  /**
   * Export audit log to JSON
   */
  async exportToJson(
    organizationId: string,
    filters?: AuditLogFilters,
    onProgress?: (progress: { current: number; total: number }) => void
  ): Promise<ServiceResponse<string>> {
    try {
      const cutoff = new Date().toISOString();

      const allEntries = await fetchAuditLogExportEntries({
        organizationId,
        filters,
        select: '*',
        applyExtraCountFilters: (query) => query.lte('created_at', cutoff),
        applyExtraPageFilters: (query) => query.lte('created_at', cutoff),
        onProgress,
      });

      await logAuditExportNotification(organizationId, allEntries.length);

      const jsonString = JSON.stringify(allEntries, null, 2);
      return createServiceSuccessResponse(jsonString);
    } catch (error) {
      return createServiceErrorResponse(error, 'AuditService error');
    }
  },

  /**
   * Get bucketed audit-event counts for the timeline histogram (issue #641).
   *
   * Calls the SECURITY DEFINER `get_audit_log_timeline` RPC, which mirrors
   * the audit_log SELECT RLS via an explicit organization_members guard.
   * The bucket parameter is whitelisted in SQL (`minute` / `hour` / `day`).
   */
  async getAuditTimeline(
    organizationId: string,
    params: {
      bucket: AuditLogTimelineBucket;
      dateFrom: string;
      dateTo: string;
      filters?: AuditLogFilters;
    }
  ): Promise<ServiceResponse<AuditLogTimelineRow[]>> {
    try {
      const { bucket, dateFrom, dateTo, filters } = params;

      const { data, error } = await supabase.rpc('get_audit_log_timeline', {
        p_organization_id: organizationId,
        p_bucket: bucket,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_entity_type:
          filters?.entityType && filters.entityType !== 'all'
            ? filters.entityType
            : undefined,
        p_action:
          filters?.action && filters.action !== 'all' ? filters.action : undefined,
        p_actor_id: filters?.actorId ?? undefined,
        p_search: filters?.search ?? undefined,
      });

      if (error) throw error;

      const rows = (data ?? []) as AuditLogTimelineRow[];
      return createServiceSuccessResponse(rows);
    } catch (error) {
      return createServiceErrorResponse(error, 'AuditService error');
    }
  },

  /**
   * Get summary statistics for audit log
   */
  async getAuditStats(
    organizationId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ServiceResponse<{
    totalEntries: number;
    byEntityType: Record<AuditEntityType, number>;
    byAction: Record<AuditAction, number>;
    topActors: Array<{ name: string; count: number }>;
  }>> {
    try {
      // Build base query
      let query = supabase
        .from('audit_log')
        .select('entity_type, action, actor_name')
        .eq('organization_id', organizationId);
      
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      
      if (dateTo) {
        query = query.lt('created_at', normalizeAuditDateTo(dateTo));
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Calculate statistics
      const entries = data as Array<{ entity_type: AuditEntityType; action: AuditAction; actor_name: string }>;
      
      const byEntityType: Record<string, number> = {};
      const byAction: Record<string, number> = {};
      const actorCounts: Record<string, number> = {};
      
      for (const entry of entries) {
        byEntityType[entry.entity_type] = (byEntityType[entry.entity_type] || 0) + 1;
        byAction[entry.action] = (byAction[entry.action] || 0) + 1;
        actorCounts[entry.actor_name] = (actorCounts[entry.actor_name] || 0) + 1;
      }
      
      // Get top 5 actors
      const topActors = Object.entries(actorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
      
      return createServiceSuccessResponse({
        totalEntries: entries.length,
        byEntityType: byEntityType as Record<AuditEntityType, number>,
        byAction: byAction as Record<AuditAction, number>,
        topActors,
      });
    } catch (error) {
      return createServiceErrorResponse(error, 'AuditService error');
    }
  },
};

// Export helper functions for use in components
export { formatChangesDescription, convertToCsvRows, generateCsvString };
