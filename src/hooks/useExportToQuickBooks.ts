/**
 * React Query hooks for exporting work orders to QuickBooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exportInvoice, getExportLogs, getLastSuccessfulExport } from '@/services/quickbooks';
import { isQuickBooksEnabled } from '@/lib/flags';
import { toast } from 'sonner';

/**
 * Hook to get export logs for a work order
 * 
 * @param workOrderId - The work order ID
 * @param enabled - Whether to enable the query (default: true)
 * @returns Query result with export logs
 */
export function useQuickBooksExportLogs(
  workOrderId: string | undefined,
  enabled: boolean = true
) {
  const featureEnabled = isQuickBooksEnabled();

  return useQuery({
    queryKey: ['quickbooks', 'export-logs', workOrderId],
    queryFn: () => {
      if (!workOrderId) {
        throw new Error('Work Order ID is required');
      }
      return getExportLogs(workOrderId);
    },
    enabled: !!workOrderId && enabled && featureEnabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get the last successful export for a work order
 * 
 * @param workOrderId - The work order ID
 * @param enabled - Whether to enable the query (default: true)
 * @returns Query result with last successful export
 */
export function useQuickBooksLastExport(
  workOrderId: string | undefined,
  enabled: boolean = true
) {
  const featureEnabled = isQuickBooksEnabled();

  return useQuery({
    queryKey: ['quickbooks', 'export', workOrderId],
    queryFn: () => {
      if (!workOrderId) {
        throw new Error('Work Order ID is required');
      }
      return getLastSuccessfulExport(workOrderId);
    },
    enabled: !!workOrderId && enabled && featureEnabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to export a work order to QuickBooks
 * 
 * @returns Mutation for exporting work order to QuickBooks
 */
export function useExportToQuickBooks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workOrderId: string) => exportInvoice(workOrderId),
    onSuccess: (result, workOrderId) => {
      if (result.success) {
        const message = result.isUpdate
          ? `Invoice ${result.invoiceNumber} updated in QuickBooks`
          : `Invoice ${result.invoiceNumber} created in QuickBooks`;
        toast.success(message);
      } else {
        toast.error(result.error || 'Failed to export to QuickBooks');
      }
      
      // Invalidate export queries
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'export', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'export-logs', workOrderId] });
    },
    onError: (error: Error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });
}

export default useExportToQuickBooks;
