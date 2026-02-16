import { useMutation, useQuery } from '@tanstack/react-query';
import { useAppToast } from '@/hooks/useAppToast';
import { 
  exportReport, 
  downloadBlob, 
  generateExportFilename,
  getReportRecordCount 
} from '@/features/reports/services/reportExportService';
import type { ReportType, ExportFilters } from '@/features/reports/types/reports';

interface UseReportExportOptions {
  reportType: ReportType;
  organizationId: string;
  organizationName: string;
  filters: ExportFilters;
}

interface ExportMutationVariables {
  columns: string[];
}

/**
 * Hook for exporting reports with TanStack Query mutation
 * 
 * Handles:
 * - Calling the export edge function
 * - Downloading the resulting CSV file
 * - Toast notifications for success/error
 * - Loading state management
 */
export function useReportExport({
  reportType,
  organizationId,
  organizationName,
  filters,
}: UseReportExportOptions) {
  const { toast } = useAppToast();

  const mutation = useMutation({
    mutationFn: async ({ columns }: ExportMutationVariables) => {
      const blob = await exportReport(reportType, organizationId, filters, columns);
      return blob;
    },
    onSuccess: (blob) => {
      const filename = generateExportFilename(reportType, organizationName);
      downloadBlob(blob, filename);
      
      toast({
        title: 'Export Complete',
        description: `Your ${reportType.replace('-', ' ')} report has been downloaded.`,
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      // Handle rate limiting specifically
      if (error.message.includes('Rate limit')) {
        toast({
          title: 'Rate Limit Exceeded',
          description: 'Please wait a moment before requesting another export.',
          variant: 'warning',
        });
      } else {
        toast({
          title: 'Export Failed',
          description: error.message || 'Failed to export report. Please try again.',
          variant: 'error',
        });
      }
    },
  });

  return {
    exportReport: mutation.mutate,
    exportReportAsync: mutation.mutateAsync,
    isExporting: mutation.isPending,
    error: mutation.error?.message ?? null,
    reset: mutation.reset,
  };
}

/**
 * Hook to get the record count for a report type
 * Used to show a preview count before export
 */
export function useReportRecordCount(
  reportType: ReportType,
  organizationId: string | undefined,
  filters: ExportFilters
) {
  return useQuery({
    queryKey: ['report-count', reportType, organizationId, filters],
    queryFn: () => {
      if (!organizationId) return 0;
      return getReportRecordCount(reportType, organizationId, filters);
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds - counts can change
    gcTime: 60 * 1000, // 1 minute
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
      const blob = await exportReport(reportType, organizationId, filters, columns);
      const filename = generateExportFilename(reportType, organizationName);
      downloadBlob(blob, filename);
      
      toast({
        title: 'Export Complete',
        description: `Your ${reportType.replace('-', ' ')} report has been downloaded.`,
        variant: 'success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      
      if (errorMessage.includes('Rate limit')) {
        toast({
          title: 'Rate Limit Exceeded',
          description: 'Please wait a moment before requesting another export.',
          variant: 'warning',
        });
      } else {
        toast({
          title: 'Export Failed',
          description: errorMessage,
          variant: 'error',
        });
      }
      
      throw error;
    }
  };

  return { handleExport };
}
