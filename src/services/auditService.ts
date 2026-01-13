/**
 * Audit Service
 * 
 * Provides methods to query audit log entries for compliance tracking,
 * entity history, and user activity reporting.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogPagination,
  AuditLogQueryResult,
  AuditEntityType,
  AuditAction,
  AuditLogCsvRow,
  ENTITY_TYPE_LABELS,
  ACTION_LABELS,
  FIELD_LABELS,
  AuditChanges,
} from '@/types/audit';

// ============================================
// Constants
// ============================================

/**
 * Maximum number of records to export in a single CSV export.
 * This limit is applied for performance reasons. Large organizations
 * requiring access to older history or larger exports should contact support.
 */
export const AUDIT_EXPORT_RECORD_LIMIT = 10000;

// ============================================
// Response Types
// ============================================

interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// ============================================
// Helper Functions
// ============================================

function handleError(error: unknown): ServiceResponse<null> {
  logger.error('AuditService error:', error);
  return {
    data: null,
    error: error instanceof Error ? error.message : 'Operation failed',
    success: false
  };
}

function handleSuccess<T>(data: T): ServiceResponse<T> {
  return {
    data,
    error: null,
    success: true
  };
}

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
 * Convert audit entries to CSV format
 */
function convertToCsvRows(entries: AuditLogEntry[]): AuditLogCsvRow[] {
  return entries.map(entry => {
    const date = new Date(entry.created_at);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
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
    'Date',
    'Time',
    'Entity Type',
    'Entity Name',
    'Action',
    'Changed By',
    'Email',
    'Changes',
  ];
  
  const csvRows = rows.map(row => [
    row.date,
    row.time,
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
      const page = pagination?.page ?? 1;
      const pageSize = pagination?.pageSize ?? 20;
      const offset = (page - 1) * pageSize;
      
      // Get total count first
      const { count, error: countError } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      
      if (countError) throw countError;
      
      // Get paginated data
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      if (error) throw error;
      
      const totalCount = count ?? 0;
      
      return handleSuccess({
        data: data as AuditLogEntry[],
        totalCount,
        hasMore: offset + pageSize < totalCount,
      });
    } catch (error) {
      return handleError(error);
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
      const page = pagination?.page ?? 1;
      const pageSize = pagination?.pageSize ?? 50;
      const offset = (page - 1) * pageSize;
      
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
        // Add one day to include the entire end date
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString());
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
      
      const totalCount = count ?? 0;
      
      return handleSuccess({
        data: data as AuditLogEntry[],
        totalCount,
        hasMore: offset + pageSize < totalCount,
      });
    } catch (error) {
      return handleError(error);
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
      const page = pagination?.page ?? 1;
      const pageSize = pagination?.pageSize ?? 20;
      const offset = (page - 1) * pageSize;
      
      // Get total count
      const { count, error: countError } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('actor_id', userId);
      
      if (countError) throw countError;
      
      // Get paginated data
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('actor_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      if (error) throw error;
      
      const totalCount = count ?? 0;
      
      return handleSuccess({
        data: data as AuditLogEntry[],
        totalCount,
        hasMore: offset + pageSize < totalCount,
      });
    } catch (error) {
      return handleError(error);
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
      
      return handleSuccess(data as AuditLogEntry[]);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Export audit log to CSV
   */
  async exportToCsv(
    organizationId: string,
    filters?: AuditLogFilters
  ): Promise<ServiceResponse<string>> {
    try {
      // Get all data matching filters (no pagination for export)
      // Limit exports for performance - see AUDIT_EXPORT_RECORD_LIMIT
      let query = supabase
        .from('audit_log')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(AUDIT_EXPORT_RECORD_LIMIT);
      
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
      
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      
      if (filters?.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString());
      }
      
      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`entity_name.ilike.${searchTerm},actor_name.ilike.${searchTerm}`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const csvRows = convertToCsvRows(data as AuditLogEntry[]);
      const csvString = generateCsvString(csvRows);
      
      return handleSuccess(csvString);
    } catch (error) {
      return handleError(error);
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
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString());
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
      
      return handleSuccess({
        totalEntries: entries.length,
        byEntityType: byEntityType as Record<AuditEntityType, number>,
        byAction: byAction as Record<AuditAction, number>,
        topActors,
      });
    } catch (error) {
      return handleError(error);
    }
  },
};

// Export helper functions for use in components
export { formatChangesDescription, convertToCsvRows, generateCsvString };
