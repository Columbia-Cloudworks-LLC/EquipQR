/**
 * Parts Managers Hooks
 * 
 * React Query hooks for managing organization-level parts managers.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getPartsManagers,
  isUserPartsManager,
  addPartsManager,
  removePartsManager,
} from '@/features/inventory/services/partsManagersService';
import { partsRoles } from '@/lib/queryKeys/misc';
import {
  createAddPartsRoleMutation,
  createRemovePartsRoleMutation,
} from '@/features/inventory/hooks/partsRoleMutationHooks';

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
    queryKey: partsRoles.managers(organizationId ?? ''),
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
    queryKey: partsRoles.isManager(organizationId ?? '', effectiveUserId ?? ''),
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
export const useAddPartsManager = createAddPartsRoleMutation({
  addAssignee: addPartsManager,
  listQueryKey: partsRoles.managers,
  statusQueryKey: partsRoles.isManager,
  successTitle: 'Parts manager added',
  successDescription: 'The user can now manage all inventory items.',
  errorTitle: 'Error adding parts manager',
  errorFallback: 'Failed to add parts manager',
});

export const useRemovePartsManager = createRemovePartsRoleMutation({
  removeAssignee: removePartsManager,
  listQueryKey: partsRoles.managers,
  statusQueryKey: partsRoles.isManager,
  successTitle: 'Parts manager removed',
  successDescription: 'The user can no longer manage inventory items.',
  errorTitle: 'Error removing parts manager',
  errorFallback: 'Failed to remove parts manager',
});
