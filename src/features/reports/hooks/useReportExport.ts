import { useQuery } from '@tanstack/react-query';
import { useAppToast } from '@/hooks/useAppToast';
import { 
  exportReport, 
  downloadBlob, 
  generateExportFilename,
  getReportRecordCount 
} from '@/features/reports/services/reportExportService';
import type { ReportType, ExportFilters } from '@/features/reports/types/reports';
import {
  downloadExportJobResult,
  showExportLoadingToast,
  waitForExportJob,
} from '@/features/reports/utils/exportJobClient';

async function runReportExportWithLoadingToast(options: {
  reportType: ReportType;
  organizationId: string;
  organizationName: string;
  filters: ExportFilters;
  columns: string[];
}): Promise<void> {
  const { reportType, organizationId, organizationName, filters, columns } = options;
  const label = reportType.replace(/-/g, ' ');
  const loading = showExportLoadingToast(`Preparing your ${label} report`);

  try {
    const result = await exportReport(reportType, organizationId, filters, columns);
    if (result instanceof Blob) {
      const filename = generateExportFilename(reportType, organizationName);
      downloadBlob(result, filename);
      loading.updateSuccess(`Your ${label} report has been downloaded.`);
      return;
    }

    const status = await waitForExportJob(result.jobId);
    if (status.status === 'failed') {
      throw new Error(status.errorMessage || 'Export job failed');
    }
    const filename = generateExportFilename(reportType, organizationName);
    await downloadExportJobResult(status, filename);
    loading.updateSuccess(
      `Your ${label} report is ready (${status.rowCount ?? 0} rows).`,
      status.resultUrl ?? undefined,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export report';
    loading.updateError(message);
    throw error;
  }
}

/**
 * Hook to get the record count for a report type
 * Used to show a preview count before export
 */
export function useReportRecordCount(
  reportType: ReportType,
  organizationId: string | undefined,
  filters: ExportFilters,
  accessibleTeamIds?: string[],
  options?: { scopeReady?: boolean },
) {
  const scopeReady = options?.scopeReady ?? true;

  return useQuery({
    queryKey: ['report-count', reportType, organizationId, filters, accessibleTeamIds],
    queryFn: () => {
      if (!organizationId) return 0;
      return getReportRecordCount(reportType, organizationId, filters, accessibleTeamIds);
    },
    enabled: !!organizationId && scopeReady,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
  });
}

/**
 * Combined hook for managing report export dialog state and actions
 */
export function useReportExportDialog(
  organizationId: string | undefined,
  organizationName: string
) {
  const { toast } = useAppToast();

  const handleExport = async (
    reportType: ReportType,
    filters: ExportFilters,
    columns: string[]
  ) => {
    if (!organizationId) {
      toast({
        title: 'Export Failed',
        description: 'Organization not selected',
        variant: 'error',
      });
      return;
    }

    try {
      await runReportExportWithLoadingToast({
        reportType,
        organizationId,
        organizationName,
        filters,
        columns,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      if (errorMessage.includes('Rate limit')) {
        toast({
          title: 'Rate Limit Exceeded',
          description: 'Please wait a moment before requesting another export.',
          variant: 'warning',
        });
      }
      throw error;
    }
  };

  return { handleExport };
}
