/**
 * Work Order Excel Export Hook
 * 
 * Provides functionality for both bulk and single work order Excel exports,
 * as well as export to Google Sheets for Google Workspace–connected organizations.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { useAppToast } from '@/hooks/useAppToast';
import type { WorkOrderExcelFilters } from '@/features/work-orders/types/workOrderExcel';
import { INTERNAL_WORK_ORDER_PACKET_POLICY } from '@/features/work-orders/constants/workOrderExportPolicy';
import { workOrderExports } from '@/lib/queryKeys';

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
  warnings?: string[];
}

/** Error response with optional code for handling insufficient scopes */
interface ExportErrorResponse {
  error: string;
  code?: string;
}

/**
 * Export work orders via edge function (bulk export)
 */
async function exportWorkOrdersExcel(
  organizationId: string,
  filters: WorkOrderExcelFilters
): Promise<Blob> {
  logger.info('Initiating bulk work order Excel export', { organizationId });

  // Use fetch directly instead of supabase.functions.invoke for binary response
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/export-work-orders-excel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      organizationId,
      filters,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`);
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

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/export-work-orders-to-google-sheets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      organizationId,
      filters,
    }),
  });

  if (!response.ok) {
    const errorData: ExportErrorResponse = await response.json().catch(() => ({ error: 'Unknown error' }));
    
    // Create a custom error that includes the code
    const error = new Error(errorData.error || `HTTP ${response.status}`) as Error & { code?: string };
    error.code = errorData.code;
    throw error;
  }

  return await response.json();
}

async function exportWorkOrdersToGoogleDocs(
  organizationId: string,
  filters: WorkOrderExcelFilters
): Promise<GoogleDocsExportResponse> {
  logger.info('Initiating Google Docs export', { organizationId });

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/export-work-orders-to-google-docs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      organizationId,
      filters,
    }),
  });

  if (!response.ok) {
    const errorData: ExportErrorResponse = await response.json().catch(() => ({ error: 'Unknown error' }));
    const error = new Error(errorData.error || `HTTP ${response.status}`) as Error & { code?: string };
    error.code = errorData.code;
    throw error;
  }

  return await response.json();
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
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
 * Generate export filename
 */
function generateExportFilename(organizationName: string): string {
  const sanitizedOrgName = organizationName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  return `${sanitizedOrgName}_internal_work_order_packet_${timestamp}.xlsx`;
}

function generateSinglePacketFilename(workOrderId: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `work_order_${workOrderId.slice(0, 8)}_internal_packet_${timestamp}.xlsx`;
}

/**
 * Get work order count for preview (uses existing count query)
 */
async function getWorkOrderCount(
  organizationId: string,
  filters: WorkOrderExcelFilters
): Promise<number> {
  let query = supabase
    .from('work_orders')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.workOrderId) {
    query = query.eq('id', filters.workOrderId);
  }
  if (filters.teamId) {
    query = query.eq('team_id', filters.teamId);
  }
  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }

  const dateField = filters.dateField || 'created_date';
  if (filters.dateRange?.from) {
    query = query.gte(dateField, filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    query = query.lte(dateField, filters.dateRange.to);
  }

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
      const filename = generateExportFilename(organizationName);
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
        description: `Created Google Sheet for ${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName} (${result.workOrderCount} work orders).`,
      });
    },
    onError: (error: Error & { code?: string }) => {
      logger.error('Google Sheets export error', error);
      
      // Check if this is an insufficient scopes error
      if (error.code === 'insufficient_scopes' || error.code === 'not_connected') {
        toast({
          title: 'Google Workspace Permissions Required',
          description: 'Please reconnect Google Workspace in Organization Settings to enable this feature.',
          variant: 'error',
        });
      } else {
        toast({
          title: 'Export Failed',
          description: error.message || `Failed to export ${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName.toLowerCase()} to Google Sheets.`,
          variant: 'error',
        });
      }
    },
  });

  const docsExportMutation = useMutation({
    mutationFn: async (filters: WorkOrderExcelFilters) => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      return exportWorkOrdersToGoogleDocs(organizationId, filters);
    },
    onSuccess: (result) => {
      window.open(result.webViewLink, '_blank', 'noopener,noreferrer');
      toast({
        title: 'Export Complete',
        description: `Created Google Doc for ${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName}.`,
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

      if (error.code === 'insufficient_scopes' || error.code === 'not_connected') {
        toast({
          title: 'Google Workspace Permissions Required',
          description: 'Please reconnect Google Workspace in Organization Settings to enable this feature.',
          variant: 'error',
        });
        return;
      }

      if (error.code === 'missing_destination') {
        toast({
          title: 'Destination Required',
          description: 'Set a Google Docs export destination in Organization Settings before exporting.',
          variant: 'error',
        });
        return;
      }

      if (error.code === 'single_work_order_required') {
        toast({
          title: 'Single Work Order Only',
          description: 'Google Docs export supports a single work order. Use Google Sheets for bulk exports.',
          variant: 'error',
        });
        return;
      }

      toast({
        title: 'Export Failed',
        description: error.message || `Failed to export ${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName.toLowerCase()} to Google Docs.`,
        variant: 'error',
      });
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
        downloadBlob(blob, generateSinglePacketFilename(workOrderId));
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
        window.open(result.webViewLink, '_blank', 'noopener,noreferrer');
        toast({
          title: 'Export Complete',
          description: `Created Google Doc for ${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName}.`,
        });
        if (result.warnings?.length) {
          toast({
            title: 'Some Photo Pages Need Review',
            description: result.warnings.join(' '),
            variant: 'warning',
          });
        }
      } catch (error) {
        const typedError = error as Error & { code?: string };
        if (typedError.code === 'missing_destination') {
          toast({
            title: 'Destination Required',
            description: 'Set a Google Docs export destination in Organization Settings before exporting.',
            variant: 'error',
          });
        } else if (typedError.code === 'insufficient_scopes' || typedError.code === 'not_connected') {
          toast({
            title: 'Google Workspace Permissions Required',
            description: 'Please reconnect Google Workspace in Organization Settings to enable this feature.',
            variant: 'error',
          });
        } else {
          toast({
            title: 'Export Failed',
            description: typedError.message || `Failed to export ${INTERNAL_WORK_ORDER_PACKET_POLICY.exportName.toLowerCase()} to Google Docs.`,
            variant: 'error',
          });
        }
      } finally {
        setIsExportingSingleToDocs(false);
      }
    },
    [organizationId, toast]
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

export default useWorkOrderExcelExport;
