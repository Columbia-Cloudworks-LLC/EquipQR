/**
 * React Query hooks for QuickBooks team-customer mapping
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getTeamCustomerMapping, 
  updateTeamCustomerMapping, 
  clearTeamCustomerMapping 
} from '@/services/quickbooks';
import { isQuickBooksEnabled } from '@/lib/flags';
import { toast } from 'sonner';

/**
 * Hook to get the QuickBooks customer mapping for a team
 * 
 * @param organizationId - The organization ID
 * @param teamId - The team ID
 * @param enabled - Whether to enable the query (default: true)
 * @returns Query result with team customer mapping
 */
export function useQuickBooksTeamMapping(
  organizationId: string | undefined,
  teamId: string | undefined,
  enabled: boolean = true
) {
  const featureEnabled = isQuickBooksEnabled();

  return useQuery({
    queryKey: ['quickbooks', 'team-mapping', organizationId, teamId],
    queryFn: () => {
      if (!organizationId || !teamId) {
        throw new Error('Organization ID and Team ID are required');
      }
      return getTeamCustomerMapping(organizationId, teamId);
    },
    enabled: !!organizationId && !!teamId && enabled && featureEnabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to update the QuickBooks customer mapping for a team
 * 
 * @returns Mutation for updating team customer mapping
 */
export function useUpdateQuickBooksTeamMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      teamId,
      quickbooksCustomerId,
      displayName,
    }: {
      organizationId: string;
      teamId: string;
      quickbooksCustomerId: string;
      displayName: string;
    }) => updateTeamCustomerMapping(organizationId, teamId, quickbooksCustomerId, displayName),
    onSuccess: (_, variables) => {
      toast.success('QuickBooks customer mapping updated');
      queryClient.invalidateQueries({ 
        queryKey: ['quickbooks', 'team-mapping', variables.organizationId, variables.teamId] 
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update mapping: ${error.message}`);
    },
  });
}

/**
 * Hook to clear the QuickBooks customer mapping for a team
 * 
 * @returns Mutation for clearing team customer mapping
 */
export function useClearQuickBooksTeamMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      teamId,
    }: {
      organizationId: string;
      teamId: string;
    }) => clearTeamCustomerMapping(organizationId, teamId),
    onSuccess: (_, variables) => {
      toast.success('QuickBooks customer mapping removed');
      queryClient.invalidateQueries({ 
        queryKey: ['quickbooks', 'team-mapping', variables.organizationId, variables.teamId] 
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to clear mapping: ${error.message}`);
    },
  });
}

export default useQuickBooksTeamMapping;
