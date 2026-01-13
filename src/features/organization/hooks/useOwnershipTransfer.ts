/**
 * useOwnershipTransfer - Hooks for managing ownership transfer requests
 * 
 * Provides queries and mutations for:
 * - Viewing pending transfer requests
 * - Initiating new transfers
 * - Accepting/rejecting transfers
 * - Cancelling pending transfers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppToast } from '@/hooks/useAppToast';
import { useNavigate } from 'react-router-dom';

// ============================================
// Types
// ============================================

export interface PendingTransferRequest {
  id: string;
  organization_id: string;
  organization_name: string;
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  transfer_reason: string | null;
  created_at: string;
  expires_at: string;
  is_incoming: boolean;
}

interface TransferResult {
  success: boolean;
  error?: string;
  message?: string;
  transfer_id?: string;
  new_personal_org_id?: string;
}

// ============================================
// Queries
// ============================================

/**
 * Get all pending transfer requests for the current user
 * (both incoming and outgoing)
 */
export const usePendingTransferRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ownership-transfers', 'pending', user?.id],
    queryFn: async (): Promise<PendingTransferRequest[]> => {
      const { data, error } = await supabase
        .rpc('get_pending_transfer_requests');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Get the pending transfer request for the current user
 * Returns the first one if there are multiple (shouldn't happen normally)
 */
export const usePendingTransferForUser = () => {
  const { data: requests, ...rest } = usePendingTransferRequests();
  
  return {
    ...rest,
    data: requests?.[0] || null,
  };
};

/**
 * Get pending transfer requests for a specific organization
 */
export const useOrganizationTransferRequests = (organizationId: string | undefined) => {
  return useQuery({
    queryKey: ['ownership-transfers', 'organization', organizationId],
    queryFn: async (): Promise<PendingTransferRequest[]> => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .rpc('get_pending_transfer_requests');

      if (error) throw error;
      
      // Filter to only this organization
      return (data || []).filter(
        (r: PendingTransferRequest) => r.organization_id === organizationId
      );
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000,
  });
};

// ============================================
// Mutations
// ============================================

/**
 * Initiate a new ownership transfer request
 */
export const useInitiateTransfer = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      toUserId,
      transferReason,
    }: {
      organizationId: string;
      toUserId: string;
      transferReason?: string;
    }): Promise<TransferResult> => {
      const { data, error } = await supabase
        .rpc('initiate_ownership_transfer', {
          p_organization_id: organizationId,
          p_to_user_id: toUserId,
          p_transfer_reason: transferReason || null,
        });

      if (error) throw error;

      const result = data as TransferResult;
      if (!result.success) {
        throw new Error(result.error || 'Failed to initiate transfer');
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ownership-transfers'] });
      toast({
        title: 'Transfer Request Sent',
        description: result.message || 'The target user will be notified to accept or decline.',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Initiate Transfer',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'error',
      });
    },
  });
};

/**
 * Accept an ownership transfer request
 */
export const useAcceptTransfer = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({
      transferId,
      departingOwnerRole = 'admin',
      responseReason,
    }: {
      transferId: string;
      departingOwnerRole?: 'admin' | 'member' | 'remove';
      responseReason?: string;
    }): Promise<TransferResult> => {
      const { data, error } = await supabase
        .rpc('respond_to_ownership_transfer', {
          p_transfer_id: transferId,
          p_accept: true,
          p_departing_owner_role: departingOwnerRole,
          p_response_reason: responseReason || null,
        });

      if (error) throw error;

      const result = data as TransferResult;
      if (!result.success) {
        throw new Error(result.error || 'Failed to accept transfer');
      }

      return result;
    },
    onSuccess: (result) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['ownership-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['simple-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });

      toast({
        title: 'Ownership Accepted',
        description: result.message || 'You are now the owner of this organization.',
        variant: 'success',
      });

      // Refresh the page to reflect new ownership
      navigate(0);
    },
    onError: (error) => {
      toast({
        title: 'Failed to Accept Transfer',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'error',
      });
    },
  });
};

/**
 * Reject an ownership transfer request
 */
export const useRejectTransfer = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      transferId,
      responseReason,
    }: {
      transferId: string;
      responseReason?: string;
    }): Promise<TransferResult> => {
      const { data, error } = await supabase
        .rpc('respond_to_ownership_transfer', {
          p_transfer_id: transferId,
          p_accept: false,
          p_departing_owner_role: 'admin', // Not used for rejection
          p_response_reason: responseReason || null,
        });

      if (error) throw error;

      const result = data as TransferResult;
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject transfer');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownership-transfers'] });

      toast({
        title: 'Transfer Declined',
        description: 'The original owner has been notified.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Decline Transfer',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'error',
      });
    },
  });
};

/**
 * Cancel a pending ownership transfer request (owner only)
 */
export const useCancelTransfer = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      transferId,
    }: {
      transferId: string;
    }): Promise<TransferResult> => {
      const { data, error } = await supabase
        .rpc('cancel_ownership_transfer', {
          p_transfer_id: transferId,
        });

      if (error) throw error;

      const result = data as TransferResult;
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel transfer');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownership-transfers'] });

      toast({
        title: 'Transfer Cancelled',
        description: 'The transfer request has been cancelled.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Cancel Transfer',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'error',
      });
    },
  });
};
