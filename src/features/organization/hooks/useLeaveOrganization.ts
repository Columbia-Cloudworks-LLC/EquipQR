/**
 * useLeaveOrganization - Hook for leaving an organization
 * 
 * Allows non-owners to leave an organization. Their name will be
 * denormalized into historical records via batch processing.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppToast } from '@/hooks/useAppToast';
import { useNavigate } from 'react-router-dom';

// ============================================
// Types
// ============================================

interface LeaveResult {
  success: boolean;
  error?: string;
  message?: string;
  departure_queue_id?: string;
}

// ============================================
// Mutations
// ============================================

/**
 * Leave an organization
 */
export const useLeaveOrganization = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({
      organizationId,
    }: {
      organizationId: string;
    }): Promise<LeaveResult> => {
      const { data, error } = await supabase
        .rpc('leave_organization', {
          p_organization_id: organizationId,
        });

      if (error) throw error;

      const result = data as LeaveResult;
      if (!result.success) {
        throw new Error(result.error || 'Failed to leave organization');
      }

      return result;
    },
    onSuccess: (result) => {
      // Invalidate all organization-related queries
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['simple-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });

      toast({
        title: 'Left Organization',
        description: result.message || 'You have successfully left the organization.',
        variant: 'success',
      });

      // Navigate to dashboard (will switch to another org if available)
      navigate('/dashboard');
    },
    onError: (error) => {
      toast({
        title: 'Failed to Leave Organization',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'error',
      });
    },
  });
};
