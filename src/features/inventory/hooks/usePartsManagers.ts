/**
 * Parts Managers Hooks
 * 
 * React Query hooks for managing organization-level parts managers.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getPartsManagers,
  isUserPartsManager,
  addPartsManager,
  removePartsManager,
  type PartsManager,
} from '@/features/inventory/services/partsManagersService';
import { useAppToast } from '@/hooks/useAppToast';

const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes

// ============================================
// Query Hooks
// ============================================

/**
 * Fetch all parts managers for an organization.
 */
export const usePartsManagers = (
  organizationId: string | undefined,
  options?: { staleTime?: number }
) => {
  const staleTime = options?.staleTime ?? DEFAULT_STALE_TIME;

  return useQuery({
    queryKey: ['parts-managers', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return await getPartsManagers(organizationId);
    },
    enabled: !!organizationId,
    staleTime,
  });
};

/**
 * Check if the current user is a parts manager for an organization.
 */
export const useIsPartsManager = (
  organizationId: string | undefined,
  userId?: string
) => {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  return useQuery({
    queryKey: ['is-parts-manager', organizationId, effectiveUserId],
    queryFn: async () => {
      if (!organizationId || !effectiveUserId) return false;
      return await isUserPartsManager(organizationId, effectiveUserId);
    },
    enabled: !!organizationId && !!effectiveUserId,
    staleTime: DEFAULT_STALE_TIME,
  });
};

// ============================================
// Mutation Hooks
// ============================================

/**
 * Add a user as a parts manager.
 */
export const useAddPartsManager = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      userId,
    }: {
      organizationId: string;
      userId: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      return await addPartsManager(organizationId, userId, user.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['parts-managers', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['is-parts-manager', variables.organizationId, variables.userId],
      });
      toast({
        title: 'Parts manager added',
        description: 'The user can now manage all inventory items.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error adding parts manager',
        description: error instanceof Error ? error.message : 'Failed to add parts manager',
        variant: 'error',
      });
    },
  });
};

/**
 * Remove a user as a parts manager.
 */
export const useRemovePartsManager = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      userId,
    }: {
      organizationId: string;
      userId: string;
    }) => {
      return await removePartsManager(organizationId, userId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['parts-managers', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['is-parts-manager', variables.organizationId, variables.userId],
      });
      toast({
        title: 'Parts manager removed',
        description: 'The user can no longer manage inventory items.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error removing parts manager',
        description: error instanceof Error ? error.message : 'Failed to remove parts manager',
        variant: 'error',
      });
    },
  });
};

// Re-export types
export type { PartsManager };
