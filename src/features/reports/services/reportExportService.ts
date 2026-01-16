import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { ReportType, ExportFilters, ExportRequest } from '@/features/reports/types/reports';

/**
 * Export a report by calling the export-report edge function
 * 
 * @param reportType - The type of report to export
 * @param organizationId - The organization ID
 * @param filters - Filters to apply to the data
 * @param columns - Array of column keys to include in the export
 * @returns Promise that resolves to a Blob containing the CSV data
 */
export async function exportReport(
  reportType: ReportType,
  organizationId: string,
  filters: ExportFilters,
  columns: string[]
): Promise<Blob> {
  const request: ExportRequest = {
    reportType,
    organizationId,
    filters,
    columns,
    format: 'csv',
  };

  logger.info('Initiating report export', { reportType, organizationId, columnCount: columns.length });

  const { data, error } = await supabase.functions.invoke('export-report', {
    body: request,
  });

  if (error) {
    logger.error('Report export failed', { error: error.message });
    throw new Error(error.message || 'Failed to export report');
  }

  // Check if the response is an error JSON response
  if (data && typeof data === 'object' && 'error' in data) {
    const errorData = data as { error: string; details?: string };
    logger.error('Report export returned error', { error: errorData.error });
    throw new Error(errorData.details || errorData.error);
  }

  // The edge function returns CSV text directly
  // Convert to Blob for download
  if (typeof data === 'string') {
    return new Blob([data], { type: 'text/csv;charset=utf-8;' });
  }

  // If data is already a Blob (unlikely but handle it)
  if (data instanceof Blob) {
    return data;
  }

  // Fallback: try to stringify if it's an object
  throw new Error('Unexpected response format from export function');
}

/**
 * Trigger a file download in the browser
 * 
 * @param blob - The file content as a Blob
 * @param filename - The desired filename
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

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
  filters: ExportFilters
): Promise<number> {
  try {
    switch (reportType) {
      case 'equipment': {
        let query = supabase
          .from('equipment')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.teamId) {
          query = query.eq('team_id', filters.teamId);
        }
        if (filters.location) {
          query = query.ilike('location', `%${filters.location}%`);
        }

        const { count } = await query;
        return count ?? 0;
      }

      case 'work-orders': {
        let query = supabase
          .from('work_orders')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.teamId) {
          query = query.eq('team_id', filters.teamId);
        }
        if (filters.priority) {
          query = query.eq('priority', filters.priority);
        }
        if (filters.dateRange?.from) {
          query = query.gte('created_date', filters.dateRange.from);
        }
        if (filters.dateRange?.to) {
          query = query.lte('created_date', filters.dateRange.to);
        }

        const { count } = await query;
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
