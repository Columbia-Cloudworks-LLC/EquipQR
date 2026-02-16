/**
 * React Query hook for searching QuickBooks customers
 */

import { useQuery } from '@tanstack/react-query';
import { searchCustomers } from '@/services/quickbooks';
import { isQuickBooksEnabled } from '@/lib/flags';

/**
 * Hook to search for QuickBooks customers
 * 
 * @param organizationId - The organization ID to search customers for
 * @param query - Optional search query to filter customers
 * @param enabled - Whether to enable the query (default: true)
 * @returns Query result with customer search results
 */
export function useQuickBooksCustomers(
  organizationId: string | undefined,
  query?: string,
  enabled: boolean = true
) {
  const featureEnabled = isQuickBooksEnabled();

  return useQuery({
    queryKey: ['quickbooks', 'customers', organizationId, query],
    queryFn: () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      return searchCustomers(organizationId, query);
    },
    enabled: !!organizationId && enabled && featureEnabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export default useQuickBooksCustomers;
