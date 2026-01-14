/**
 * useDeleteOrganization - Hooks for deleting an organization
 * 
 * Provides:
 * - Query for deletion stats (what will be deleted)
 * - Mutation for deleting the organization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppToast } from '@/hooks/useAppToast';
import { useNavigate } from 'react-router-dom';

// ============================================
// Types
// ============================================

export interface DeletionStats {
  success: boolean;
  error?: string;
  member_count: number;
  equipment_count: number;
  work_order_count: number;
  team_count: number;
  inventory_count: number;
  can_delete: boolean;
}

interface DeleteResult {
  success: boolean;
  error?: string;
  message?: string;
  deleted_stats?: {
    equipment: number;
    work_orders: number;
    members_removed: number;
  };
}

// ============================================
// Queries
// ============================================

/**
 * Get statistics about what will be deleted when organization is deleted
 */
export const useOrganizationDeletionStats = (
  organizationId: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['organization-deletion-stats', organizationId],
    queryFn: async (): Promise<DeletionStats | null> => {
      const { data, error } = await supabase
        .rpc('get_organization_deletion_stats', {
          p_organization_id: organizationId,
        });

      if (error) throw error;

      const result = data as DeletionStats;
      if (!result.success) {
        throw new Error(result.error || 'Failed to get deletion stats');
      }

      return result;
    },
    enabled: !!organizationId && enabled,
    staleTime: 10 * 1000, // 10 seconds
  });
};

// ============================================
// Mutations
// ============================================

/**
 * Delete an organization
 */
export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({
      organizationId,
      confirmationName,
      force = false,
    }: {
      organizationId: string;
      confirmationName: string;
      force?: boolean;
    }): Promise<DeleteResult> => {
      const { data, error } = await supabase
        .rpc('delete_organization', {
          p_organization_id: organizationId,
          p_confirmation_name: confirmationName,
          p_force: force,
        });

      if (error) throw error;

      const result = data as DeleteResult;
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete organization');
      }

      return result;
    },
    onSuccess: (result) => {
      // Invalidate all organization-related queries
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['simple-organizations'] });

      toast({
        title: 'Organization Deleted',
        description: result.message || 'The organization has been permanently deleted.',
        variant: 'success',
      });

      // Navigate to dashboard (will switch to another org)
      navigate('/dashboard');
    },
    onError: (error) => {
      toast({
        title: 'Failed to Delete Organization',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'error',
      });
    },
  });
};
