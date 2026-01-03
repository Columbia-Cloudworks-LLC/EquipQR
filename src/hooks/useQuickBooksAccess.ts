/**
 * Hook for checking QuickBooks access permissions
 * 
 * Uses the can_user_manage_quickbooks RPC to determine if the current user
 * can manage QuickBooks for the specified organization.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { isQuickBooksEnabled } from '@/lib/flags';
import { toast } from 'sonner';

/**
 * Hook to check if the current user can manage QuickBooks
 * 
 * @param organizationId - Optional organization ID (defaults to current organization)
 * @returns Query result with canManageQuickBooks boolean
 */
export function useQuickBooksAccess(organizationId?: string) {
  const { currentOrganization } = useOrganization();
  const orgId = organizationId || currentOrganization?.id;
  const featureEnabled = isQuickBooksEnabled();

  return useQuery({
    queryKey: ['quickbooks', 'access', orgId],
    queryFn: async () => {
      if (!orgId) {
        return false;
      }

      const { data, error } = await supabase
        .rpc('get_user_quickbooks_permission', {
          p_organization_id: orgId,
        });

      if (error) {
        console.error('Error checking QuickBooks permission:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!orgId && featureEnabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for owners to update a member's QuickBooks permission
 * 
 * @param organizationId - The organization ID
 * @returns Mutation for updating QuickBooks permission
 */
export function useUpdateQuickBooksPermission(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      targetUserId, 
      canManageQuickBooks 
    }: { 
      targetUserId: string; 
      canManageQuickBooks: boolean;
    }) => {
      const { data, error } = await supabase
        .rpc('update_member_quickbooks_permission', {
          p_organization_id: organizationId,
          p_target_user_id: targetUserId,
          p_can_manage_quickbooks: canManageQuickBooks,
        });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0 || !data[0].success) {
        throw new Error(data?.[0]?.message || 'Failed to update permission');
      }

      return data[0];
    },
    onSuccess: (result) => {
      toast.success(result.message);
      // Invalidate relevant queries - use specific organizationId to avoid unnecessary refetches
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'access', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update permission: ${error.message}`);
    },
  });
}

export default useQuickBooksAccess;
