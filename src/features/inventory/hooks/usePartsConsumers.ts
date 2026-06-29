/**
 * Parts Consumers Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getPartsConsumers,
  isUserPartsConsumer,
  addPartsConsumer,
  removePartsConsumer,
} from '@/features/inventory/services/partsConsumersService';
import { partsRoles } from '@/lib/queryKeys/misc';
import {
  createAddPartsRoleMutation,
  createRemovePartsRoleMutation,
} from '@/features/inventory/hooks/partsRoleMutationHooks';

const DEFAULT_STALE_TIME = 5 * 60 * 1000;

export const usePartsConsumers = (
  organizationId: string | undefined,
  options?: { staleTime?: number },
) => {
  const staleTime = options?.staleTime ?? DEFAULT_STALE_TIME;

  return useQuery({
    queryKey: partsRoles.consumers(organizationId ?? ''),
    queryFn: async () => {
      if (!organizationId) return [];
      return await getPartsConsumers(organizationId);
    },
    enabled: !!organizationId,
    staleTime,
  });
};

export const useIsPartsConsumer = (
  organizationId: string | undefined,
  userId?: string,
) => {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  return useQuery({
    queryKey: partsRoles.isConsumer(organizationId ?? '', effectiveUserId ?? ''),
    queryFn: async () => {
      if (!organizationId || !effectiveUserId) return false;
      return await isUserPartsConsumer(organizationId, effectiveUserId);
    },
    enabled: !!organizationId && !!effectiveUserId,
    staleTime: DEFAULT_STALE_TIME,
  });
};

export const useAddPartsConsumer = createAddPartsRoleMutation({
  addAssignee: addPartsConsumer,
  listQueryKey: partsRoles.consumers,
  statusQueryKey: partsRoles.isConsumer,
  successTitle: 'Parts consumer added',
  successDescription: 'The user can now view inventory and use part lookup.',
  errorTitle: 'Error adding parts consumer',
  errorFallback: 'Failed to add parts consumer',
});

export const useRemovePartsConsumer = createRemovePartsRoleMutation({
  removeAssignee: removePartsConsumer,
  listQueryKey: partsRoles.consumers,
  statusQueryKey: partsRoles.isConsumer,
  successTitle: 'Parts consumer removed',
  successDescription: 'The user can no longer view inventory or use part lookup.',
  errorTitle: 'Error removing parts consumer',
  errorFallback: 'Failed to remove parts consumer',
});
