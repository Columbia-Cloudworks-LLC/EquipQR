/**
 * Work Order Excel Export Hook
 * 
 * Provides functionality for both bulk and single work order Excel exports.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { useAppToast } from '@/hooks/useAppToast';
import { generateSingleWorkOrderExcel } from '@/features/work-orders/services/workOrderExcelService';
import type { WorkOrderExcelFilters } from '@/features/work-orders/types/workOrderExcel';

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
  return `${sanitizedOrgName}_work_orders_detailed_${timestamp}.xlsx`;
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
    queryKey: ['work-order-excel-count', organizationId, filters],
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
        description: 'Your work orders Excel file has been downloaded.',
      });
    },
    onError: (error) => {
      logger.error('Bulk export error', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export work orders',
        variant: 'error',
      });
    },
  });

  // Function for single work order export (client-side)
  const exportSingle = useCallback(
    async (workOrderId: string) => {
      logger.info('Export Excel button clicked', { workOrderId, organizationId, organizationName });
      
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
        logger.info('Starting Excel export', { workOrderId, organizationId });
        await generateSingleWorkOrderExcel(workOrderId, organizationId);
        logger.info('Excel export succeeded', { workOrderId });
        toast({
          title: 'Export Complete',
          description: 'Your work order Excel file has been downloaded.',
        });
      } catch (error) {
        logger.error('Single WO export error', { error, workOrderId, organizationId });
        const errorMessage = error instanceof Error ? error.message : 'Failed to export work order';
        toast({
          title: 'Export Failed',
          description: errorMessage,
          variant: 'error',
        });
      } finally {
        setIsExportingSingle(false);
      }
    },
    [organizationId, organizationName, toast]
  );

  return {
    // Bulk export
    bulkExport: bulkExportMutation.mutate,
    bulkExportAsync: bulkExportMutation.mutateAsync,
    isBulkExporting: bulkExportMutation.isPending,
    bulkExportError: bulkExportMutation.error?.message ?? null,

    // Single export
    exportSingle,
    isExportingSingle,
  };
}

export default useWorkOrderExcelExport;
