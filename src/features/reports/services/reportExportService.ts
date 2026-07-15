import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { ReportType, ExportFilters, ExportRequest } from '@/features/reports/types/reports';
import {
  buildEquipmentExportCountQuery,
  buildWorkOrderExportCountQuery,
} from '@/features/reports/utils/exportCountQueries';

/**
 * Export a report by calling the export-report edge function.
 * Equipment and work-orders use async jobs by default (#1193) when `asyncMode` is true.
 */
export async function exportReport(
  reportType: ReportType,
  organizationId: string,
  filters: ExportFilters,
  columns: string[],
  options?: { asyncMode?: boolean },
): Promise<Blob | { async: true; jobId: string; status: string }> {
  const asyncMode =
    options?.asyncMode === true ||
    (options?.asyncMode !== false && (reportType === 'equipment' || reportType === 'work-orders'));

  const request: ExportRequest & { async?: boolean } = {
    reportType,
    organizationId,
    filters,
    columns,
    format: 'csv',
    ...(asyncMode ? { async: true } : {}),
  };

  logger.info('Initiating report export', {
    reportType,
    organizationId,
    columnCount: columns.length,
    asyncMode,
  });

  const invokeResult = await supabase.functions
    .invoke('export-report', {
      body: request,
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to invoke export-report';
      logger.error('Report export invoke failed', { error: msg });
      throw new Error(msg, { cause: err });
    });

  const { data, error: invokeError } = invokeResult;
  if (invokeError) {
    logger.error('Report export failed', { error: invokeError.message });
    throw new Error(invokeError.message || 'Failed to export report', { cause: invokeError });
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const errorData = data as { error: string; details?: string };
    logger.error('Report export returned error', { error: errorData.error });
    throw new Error(errorData.details || errorData.error);
  }

  if (
    data &&
    typeof data === 'object' &&
    'async' in data &&
    (data as { async?: boolean }).async === true &&
    'jobId' in data
  ) {
    const job = data as { async: true; jobId: string; status: string };
    return { async: true, jobId: job.jobId, status: job.status };
  }

  if (typeof data === 'string') {
    return new Blob([data], { type: 'text/csv;charset=utf-8;' });
  }

  if (data instanceof Blob) {
    return data;
  }

  throw new Error('Unexpected response format from export function');
}

/**
 * Trigger a file download in the browser
 * 
 * @param blob - The file content as a Blob
 * @param filename - The desired filename
 */
export { downloadBlob } from '@/utils/exportUtils';

/**
 * Generate a filename for the export
 * 
 * @param reportType - The type of report
 * @param organizationName - The organization name (sanitized)
 * @returns A formatted filename
 */
export function generateExportFilename(
  reportType: ReportType,
  organizationName: string
): string {
  const sanitizedOrgName = organizationName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  const reportTypeLabel = reportType.replace('-', '_');
  return `${sanitizedOrgName}_${reportTypeLabel}_export_${timestamp}.csv`;
}

/**
 * Get record count for a report type (for preview before export)
 * This queries the database directly to show a count before initiating the export
 */
export async function getReportRecordCount(
  reportType: ReportType,
  organizationId: string,
  filters: ExportFilters,
  accessibleTeamIds?: string[],
): Promise<number> {
  try {
    switch (reportType) {
      case 'equipment': {
        const { count } = await buildEquipmentExportCountQuery(organizationId, filters);
        return count ?? 0;
      }

      case 'work-orders': {
        if (accessibleTeamIds !== undefined && accessibleTeamIds.length === 0) {
          return 0;
        }
        const { count } = await buildWorkOrderExportCountQuery(organizationId, {
          status: filters.status,
          teamId: filters.teamId,
          priority: filters.priority,
          dateRange: filters.dateRange,
        }, accessibleTeamIds);
        return count ?? 0;
      }

      case 'inventory': {
        let query = supabase
          .from('inventory_items')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        if (filters.location) {
          query = query.ilike('location', `%${filters.location}%`);
        }

        const { count } = await query;
        return count ?? 0;
      }

      case 'scans': {
        // Scans require joining through equipment to filter by org
        // This is a simplified count - the actual export handles this server-side
        const { data: equipment } = await supabase
          .from('equipment')
          .select('id')
          .eq('organization_id', organizationId);

        if (!equipment || equipment.length === 0) {
          return 0;
        }

        const equipmentIds = equipment.map(e => e.id);
        
        let query = supabase
          .from('scans')
          .select('id', { count: 'exact', head: true })
          .in('equipment_id', equipmentIds);

        if (filters.dateRange?.from) {
          query = query.gte('scanned_at', filters.dateRange.from);
        }
        if (filters.dateRange?.to) {
          query = query.lte('scanned_at', filters.dateRange.to);
        }

        const { count } = await query;
        return count ?? 0;
      }

      case 'operator-check-ins': {
        let query = supabase
          .from('operator_checkin_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        if (filters.dateRange?.from) {
          query = query.gte('submitted_at', filters.dateRange.from);
        }
        if (filters.dateRange?.to) {
          query = query.lte('submitted_at', filters.dateRange.to);
        }

        const { count } = await query;
        return count ?? 0;
      }

      case 'quick-forms': {
        let query = supabase
          .from('quick_form_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        if (filters.dateRange?.from) {
          query = query.gte('submitted_at', filters.dateRange.from);
        }
        if (filters.dateRange?.to) {
          query = query.lte('submitted_at', filters.dateRange.to);
        }

        const { count } = await query;
        return count ?? 0;
      }

      case 'alternate-groups': {
        // Count members across all alternate groups for this organization
        // Each member (inventory item or part identifier) is one row in the export
        const { data: groups } = await supabase
          .from('part_alternate_groups')
          .select('id')
          .eq('organization_id', organizationId);

        if (!groups || groups.length === 0) {
          return 0;
        }

        const groupIds = groups.map(g => g.id);
        
        const { count } = await supabase
          .from('part_alternate_group_members')
          .select('id', { count: 'exact', head: true })
          .in('group_id', groupIds);

        return count ?? 0;
      }

      default:
        return 0;
    }
  } catch (error) {
    logger.error('Failed to get report record count', { error, reportType });
    return 0;
  }
}
