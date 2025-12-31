/**
 * React Query hooks for exporting work orders to QuickBooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExportLogs, getLastSuccessfulExport } from '@/services/quickbooks';
import { supabase } from '@/integrations/supabase/client';
import type {
  QuickBooksExportInvoiceRequest,
  QuickBooksExportInvoiceResponse,
  InvoiceExportResult,
} from '@/services/quickbooks/types';
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
 * @returns TanStack Query mutation result for exporting a work order to QuickBooks,
 *          including status flags (isPending, isSuccess, isError), data, error,
 *          mutate/mutateAsync functions, and an `isLoading` alias for backward compatibility.
 */
export function useExportToQuickBooks() {
  const queryClient = useQueryClient();

  const mutation = useMutation<InvoiceExportResult, Error, string>({
    mutationFn: async (workOrderId: string): Promise<InvoiceExportResult> => {
      const request: QuickBooksExportInvoiceRequest = {
        work_order_id: workOrderId,
      };

      const { data, error: invokeError } = await supabase.functions.invoke<
        QuickBooksExportInvoiceResponse
      >('quickbooks-export-invoice', {
        body: request,
      });

      // Handle invoke errors (network, non-2xx responses)
      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to export invoice');
      }

      // Handle function-level errors (success: false in response)
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to export invoice');
      }

      // Map snake_case response to camelCase result
      return {
        success: true,
        invoiceId: data.invoice_id,
        invoiceNumber: data.invoice_number,
        isUpdate: data.is_update,
      };
    },
    onSuccess: (result) => {
      const message = result.isUpdate
        ? `Invoice ${result.invoiceNumber} updated in QuickBooks`
        : `Invoice ${result.invoiceNumber} created in QuickBooks`;
      toast.success(message);
    },
    onError: (error: Error) => {
      toast.error(`Export failed: ${error.message}`);
    },
    onSettled: (
      _data: InvoiceExportResult | undefined,
      _error: Error | null,
      variables: string
    ) => {
      // Keep export status/logs fresh after either success or failure
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'export', variables] });
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'export-logs', variables] });
    },
  });

  // Expose isLoading for backward compatibility (React Query v5 uses isPending)
  return {
    ...mutation,
    isLoading: mutation.isPending,
  };
}

export default useExportToQuickBooks;
