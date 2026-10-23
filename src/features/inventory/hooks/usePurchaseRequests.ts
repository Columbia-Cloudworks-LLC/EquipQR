import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useAppToast } from '@/hooks/useAppToast';
import { inventory as inventoryKeys } from '@/lib/queryKeys';
import {
  cancelInventoryPurchaseRequest,
  createInventoryPurchaseRequest,
  getInventoryPurchaseRequests,
  markInventoryPurchaseRequestOrdered,
  receiveInventoryPurchaseRequest,
} from '@/features/inventory/services/purchaseRequestsService';
import type {
  CreateInventoryPurchaseRequestInput,
  InventoryPurchaseRequestStatus,
  ReceiveInventoryPurchaseRequestInput,
} from '@/features/inventory/types/inventory';

const DEFAULT_STALE_TIME = 2 * 60 * 1000;

export function useInventoryPurchaseRequests(
  organizationId: string | undefined,
  options?: {
    status?: InventoryPurchaseRequestStatus | 'all';
    inventoryItemId?: string;
    enabled?: boolean;
  },
) {
  const status = options?.status ?? 'all';
  const inventoryItemId = options?.inventoryItemId;
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: inventoryKeys.purchaseRequests(organizationId ?? '', status, inventoryItemId),
    queryFn: async () => {
      if (!organizationId) return [];
      return await getInventoryPurchaseRequests(organizationId, {
        status,
        inventoryItemId,
      });
    },
    enabled: enabled && !!organizationId,
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useCreateInventoryPurchaseRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const appToast = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      input,
    }: {
      organizationId: string;
      input: CreateInventoryPurchaseRequestInput;
    }) => {
      if (!user) throw new Error('User must be authenticated');
      return await createInventoryPurchaseRequest(organizationId, user.id, input);
    },
    onSuccess: (created, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.purchaseRequestsRoot(variables.organizationId),
      });
      appToast.success({
        description: `Restock request created (${created.requested_quantity} requested)`,
      });
    },
    onError: (error) => {
      appToast.error({
        description:
          error instanceof Error ? error.message : 'Failed to create purchase request',
      });
    },
  });
}

function usePurchaseRequestStatusMutation(
  mutateFn: (organizationId: string, requestId: string, userId: string) => Promise<unknown>,
  successMessage: string,
  errorFallback: string,
) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const appToast = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      requestId,
    }: {
      organizationId: string;
      requestId: string;
    }) => {
      if (!user) throw new Error('User must be authenticated');
      return await mutateFn(organizationId, requestId, user.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.purchaseRequestsRoot(variables.organizationId),
      });
      appToast.success({ description: successMessage });
    },
    onError: (error) => {
      appToast.error({
        description: error instanceof Error ? error.message : errorFallback,
      });
    },
  });
}

export function useMarkPurchaseRequestOrdered() {
  return usePurchaseRequestStatusMutation(
    markInventoryPurchaseRequestOrdered,
    'Purchase request marked as ordered',
    'Failed to mark purchase request ordered',
  );
}

export function useCancelPurchaseRequest() {
  return usePurchaseRequestStatusMutation(
    cancelInventoryPurchaseRequest,
    'Purchase request cancelled',
    'Failed to cancel purchase request',
  );
}

export function useReceivePurchaseRequest() {
  const queryClient = useQueryClient();
  const appToast = useAppToast();

  return useMutation({
    mutationFn: async ({
      input,
    }: {
      organizationId: string;
      input: ReceiveInventoryPurchaseRequestInput;
    }) => {
      return await receiveInventoryPurchaseRequest(input);
    },
    onSuccess: (received, variables) => {
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.purchaseRequestsRoot(variables.organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.listPrefix(variables.organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.metadata(variables.organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: ['inventory-item', variables.organizationId, received.inventory_item_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['inventory-transactions', variables.organizationId],
      });
      appToast.success({
        description: `Received +${received.received_quantity ?? variables.input.receivedQuantity} units into inventory`,
      });
    },
    onError: (error) => {
      appToast.error({
        description:
          error instanceof Error ? error.message : 'Failed to receive purchase request',
      });
    },
  });
}
