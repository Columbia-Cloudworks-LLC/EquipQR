/**
 * React Query hook for QuickBooks connection status
 */

import { useQuery } from '@tanstack/react-query';
import { getConnectionStatus } from '@/services/quickbooks';
import { isQuickBooksEnabled } from '@/lib/flags';

/**
 * Hook to get the QuickBooks connection status for an organization
 * 
 * @param organizationId - The organization ID to check connection for
 * @param enabled - Whether to enable the query (default: true)
 * @returns Query result with connection status
 */
export function useQuickBooksConnection(
  organizationId: string | undefined,
  enabled: boolean = true
) {
  const featureEnabled = isQuickBooksEnabled();

  return useQuery({
    queryKey: ['quickbooks', 'connection', organizationId],
    queryFn: () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      return getConnectionStatus(organizationId);
    },
    enabled: !!organizationId && enabled && featureEnabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export default useQuickBooksConnection;
