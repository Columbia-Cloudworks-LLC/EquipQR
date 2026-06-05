// fallow-ignore-file code-duplication
// Duplication rationale: Excel export repeats count and export orchestration blocks
/**
 * Work Order Excel Export Hook
 * 
 * Provides functionality for both bulk and single work order Excel exports,
 * as well as export to Google Sheets for Google Workspace–connected organizations.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast as sonnerToast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { buildWorkOrderExportCountQuery } from '@/features/reports/utils/exportCountQueries';
import { logger } from '@/utils/logger';
import { useAppToast } from '@/hooks/useAppToast';
import type { WorkOrderExcelFilters } from '@/features/work-orders/types/workOrderExcel';
import { INTERNAL_WORK_ORDER_PACKET_POLICY } from '@/features/work-orders/constants/workOrderExportPolicy';
import { workOrderExports, exportArtifacts } from '@/lib/queryKeys';
import { downloadBlob } from '@/utils/exportUtils';
import {
  generateSingleWorkOrderPacketFilename,
  generateWorkOrderExportFilename,
  parseWorkOrderExportError,
  postWorkOrderExport,
} from '@/features/work-orders/services/workOrderExportPost';
import { handleGoogleWorkspaceExportError } from '@/features/work-orders/utils/googleWorkspaceExportToasts';

/** Response from the export-work-orders-to-google-sheets function */
interface GoogleSheetsExportResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
  workOrderCount: number;
}

interface GoogleDocsExportResponse {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  workOrderCount: number;
  replacedPrevious?: boolean;
  warnings?: string[];
}

/**
 * Export work orders via edge function (bulk export)
 */
async function exportWorkOrdersExcel(
  organizationId: string,
  filters: WorkOrderExcelFilters
): Promise<Blob> {
  logger.info('Initiating bulk work order Excel export', { organizationId });

  const response = await postWorkOrderExport(
    'export-work-orders-excel',
    organizationId,
    filters
  );

  if (!response.ok) {
    const error = await parseWorkOrderExportError(response);
    throw error;
  }

  const data = await response.arrayBuffer();

  // Return the ArrayBuffer as a Blob
  return new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Export work orders to Google Sheets via edge function
 */
async function exportWorkOrdersToGoogleSheets(
  organizationId: string,
  filters: WorkOrderExcelFilters
): Promise<GoogleSheetsExportResponse> {
  logger.info('Initiating Google Sheets export', { organizationId });

  const response = await postWorkOrderExport(
    'export-work-orders-to-google-sheets',
    organizationId,
    filters
  );

  if (!response.ok) {
    throw await parseWorkOrderExportError(response);
  }

  return await response.json();
}

async function exportWorkOrdersToGoogleDocs(
  organizationId: string,
  filters: WorkOrderExcelFilters
): Promise<GoogleDocsExportResponse> {
  logger.info('Initiating Google Docs export', { organizationId });

  const response = await postWorkOrderExport(
    'export-work-orders-to-google-docs',
    organizationId,
    filters
  );

  if (!response.ok) {
    throw await parseWorkOrderExportError(response);
  }

  return await response.json();
}

/**
 * Get work order count for preview (uses existing count query)
 */
async function getWorkOrderCount(
  organizationId: string,
  filters: WorkOrderExcelFilters
): Promise<number> {
  const query = buildWorkOrderExportCountQuery(organizationId, {
    status: filters.status,
    workOrderId: filters.workOrderId,
    teamId: filters.teamId,
    priority: filters.priority,
    dateField: filters.dateField || 'created_date',
    dateRange: filters.dateRange,
  });

  const { count } = await query;
  return count ?? 0;
}

/**
 * Hook for work order count with filters
 */
export function useWorkOrderExcelCount(
  organizationId: string | undefined,
  filters: WorkOrderExcelFilters
) {
  return useQuery({
    queryKey: workOrderExports.excelCount(organizationId ?? '', filters),
    queryFn: () => {
      if (!organizationId) return 0;
      return getWorkOrderCount(organizationId, filters);
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Main hook for work order Excel exports
 */
export function useWorkOrderExcelExport(
  organizationId: string | undefined,
  organizationName: string
) {
  const { toast } = useAppToast();
  const queryClient = useQueryClient();
  const [isExportingSingle, setIsExportingSingle] = useState(false);
  const [isExportingSingleToDocs, setIsExportingSingleToDocs] = useState(false);

  // Mutation for bulk export via edge function
  const bulkExportMutation = useMutation({
    mutationFn: async (filters: WorkOrderExcelFilters) => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      return exportWorkOrdersExcel(organizationId, filters);
    },
    onSuccess: (blob) => {
      const filename = generateWorkOrderExportFilename(organizationName);
      downloadBlob(blob, filename);
      toast({
        title: 'Export Complete',
        description: `${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName} has been downloaded.`,
      });
    },
    onError: (error) => {
      logger.error('Bulk export error', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : `Failed to export ${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName.toLowerCase()}.`,
        variant: 'error',
      });
    },
  });

  // Mutation for Google Sheets export
  const sheetsExportMutation = useMutation({
    mutationFn: async (filters: WorkOrderExcelFilters) => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      return exportWorkOrdersToGoogleSheets(organizationId, filters);
    },
    onSuccess: (result) => {
      // Open the spreadsheet in a new tab
      window.open(result.spreadsheetUrl, '_blank', 'noopener,noreferrer');
      toast({
        title: 'Export Complete',
        description: `Created Google Sheet in your organization Drive folder for ${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName} (${result.workOrderCount} work orders).`,
      });
    },
    onError: (error: Error & { code?: string }) => {
      logger.error('Google Sheets export error', error);
      handleGoogleWorkspaceExportError(toast, error, 'Sheets');
    },
  });

  const docsExportMutation = useMutation({
    mutationFn: async (filters: WorkOrderExcelFilters) => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      return exportWorkOrdersToGoogleDocs(organizationId, filters);
    },
    onSuccess: (result, filters) => {
      if (organizationId && filters.workOrderId) {
        void queryClient.invalidateQueries({
          queryKey: exportArtifacts.byRecord(organizationId, 'work_order', filters.workOrderId),
        });
      }
      const desc = result.replacedPrevious
        ? `Updated Google Doc in your organization Drive folder for ${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName}.`
        : `Created Google Doc in your organization Drive folder for ${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName}.`;
      sonnerToast.success('Export Complete', {
        description: desc,
        action: {
          label: 'Open',
          onClick: () => window.open(result.webViewLink, '_blank', 'noopener,noreferrer'),
        },
      });
      if (result.warnings?.length) {
        toast({
          title: 'Some Photo Pages Need Review',
          description: result.warnings.join(' '),
          variant: 'warning',
        });
      }
    },
    onError: (error: Error & { code?: string }) => {
      logger.error('Google Docs export error', error);
      handleGoogleWorkspaceExportError(toast, error, 'Docs');
    },
  });

  // Function for single work order export (internal packet via edge function)
  const exportSingle = useCallback(
    async (workOrderId: string) => {
      logger.info('Internal packet export button clicked', { workOrderId, organizationId, organizationName });
      
      if (!organizationId) {
        logger.error('Export failed: Organization ID missing', { workOrderId });
        toast({
          title: 'Export Failed',
          description: 'Organization ID is required. Please refresh the page and try again.',
          variant: 'error',
        });
        return;
      }

      if (!workOrderId) {
        logger.error('Export failed: Work Order ID missing');
        toast({
          title: 'Export Failed',
          description: 'Work Order ID is required.',
          variant: 'error',
        });
        return;
      }

      setIsExportingSingle(true);
      try {
        logger.info('Starting internal packet export for single work order', { workOrderId, organizationId });
        const blob = await exportWorkOrdersExcel(organizationId, {
          workOrderId,
          dateField: 'created_date',
        });
        downloadBlob(blob, generateSingleWorkOrderPacketFilename(workOrderId));
        logger.info('Internal packet export succeeded', { workOrderId });
        toast({
          title: 'Export Complete',
          description: `${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName} has been downloaded.`,
        });
      } catch (error) {
        logger.error('Single WO export error', { error, workOrderId, organizationId });
        const errorMessage = error instanceof Error ? error.message : 'Failed to export work order';
        toast({
          title: 'Export Failed',
          description: errorMessage || `Failed to export ${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName.toLowerCase()}.`,
          variant: 'error',
        });
      } finally {
        setIsExportingSingle(false);
      }
    },
    [organizationId, organizationName, toast]
  );

  const exportSingleToDocs = useCallback(
    async (workOrderId: string) => {
      if (!organizationId) {
        toast({
          title: 'Export Failed',
          description: 'Organization ID is required. Please refresh the page and try again.',
          variant: 'error',
        });
        return;
      }

      if (!workOrderId) {
        toast({
          title: 'Export Failed',
          description: 'Work Order ID is required.',
          variant: 'error',
        });
        return;
      }

      setIsExportingSingleToDocs(true);
      try {
        const result = await exportWorkOrdersToGoogleDocs(organizationId, {
          workOrderId,
          dateField: 'created_date',
        });
        void queryClient.invalidateQueries({
          queryKey: exportArtifacts.byRecord(organizationId, 'work_order', workOrderId),
        });
        const desc = result.replacedPrevious
          ? `Updated Google Doc in your organization Drive folder for ${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName}.`
          : `Created Google Doc in your organization Drive folder for ${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName}.`;
        sonnerToast.success('Export Complete', {
          description: desc,
          action: {
            label: 'Open',
            onClick: () => window.open(result.webViewLink, '_blank', 'noopener,noreferrer'),
          },
        });
        if (result.warnings?.length) {
          toast({
            title: 'Some Photo Pages Need Review',
            description: result.warnings.join(' '),
            variant: 'warning',
          });
        }
      } catch (error) {
        handleGoogleWorkspaceExportError(toast, error as Error & { code?: string }, 'Docs');
      } finally {
        setIsExportingSingleToDocs(false);
      }
    },
    [organizationId, toast, queryClient]
  );

  return {
    // Bulk export (Excel download)
    bulkExport: bulkExportMutation.mutate,
    bulkExportAsync: bulkExportMutation.mutateAsync,
    isBulkExporting: bulkExportMutation.isPending,
    bulkExportError: bulkExportMutation.error?.message ?? null,

    // Single export
    exportSingle,
    isExportingSingle,

    // Google Sheets export
    exportToSheets: sheetsExportMutation.mutate,
    exportToSheetsAsync: sheetsExportMutation.mutateAsync,
    isExportingToSheets: sheetsExportMutation.isPending,
    exportToSheetsError: sheetsExportMutation.error?.message ?? null,

    // Google Docs export
    exportToDocs: docsExportMutation.mutate,
    exportToDocsAsync: docsExportMutation.mutateAsync,
    isExportingToDocs: docsExportMutation.isPending,
    exportToDocsError: docsExportMutation.error?.message ?? null,
    exportSingleToDocs,
    isExportingSingleToDocs,
  };
}

