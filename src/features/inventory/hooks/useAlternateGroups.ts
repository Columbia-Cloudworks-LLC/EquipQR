import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getAlternateGroups,
  createAlternateGroup,
  getAlternateGroupById,
  updateAlternateGroup,
  deleteAlternateGroup,
  addInventoryItemToGroup,
  removeGroupMember,
  createPartIdentifier,
  addIdentifierToGroup,
} from '@/features/inventory/services/partAlternatesService';
import type {
  PartIdentifierType,
  VerificationStatus,
} from '@/features/inventory/types/inventory';
import { useAppToast } from '@/hooks/useAppToast';

const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes

// ============================================
// Query Hooks
// ============================================

/**
 * Fetch all alternate groups for an organization.
 */
export const useAlternateGroups = (
  organizationId: string | undefined,
  options?: { staleTime?: number }
) => {
  const staleTime = options?.staleTime ?? DEFAULT_STALE_TIME;

  return useQuery({
    queryKey: ['alternate-groups', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return await getAlternateGroups(organizationId);
    },
    enabled: !!organizationId,
    staleTime,
  });
};

/**
 * Fetch a single alternate group with its members.
 */
export const useAlternateGroup = (
  organizationId: string | undefined,
  groupId: string | undefined,
  options?: { staleTime?: number }
) => {
  const staleTime = options?.staleTime ?? DEFAULT_STALE_TIME;

  return useQuery({
    queryKey: ['alternate-group', organizationId, groupId],
    queryFn: async () => {
      if (!organizationId || !groupId) return null;
      return await getAlternateGroupById(organizationId, groupId);
    },
    enabled: !!organizationId && !!groupId,
    staleTime,
  });
};

// ============================================
// Mutation Hooks
// ============================================

export interface CreateAlternateGroupInput {
  name: string;
  description?: string;
  status?: VerificationStatus;
  notes?: string;
  evidence_url?: string;
}

/**
 * Create a new alternate group.
 */
export const useCreateAlternateGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: CreateAlternateGroupInput;
    }) => {
      return await createAlternateGroup(organizationId, data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['alternate-groups', variables.organizationId],
      });
      toast({
        title: 'Alternate group created',
        description: `"${data.name}" has been created.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating alternate group',
        description: error instanceof Error ? error.message : 'Failed to create group',
        variant: 'error',
      });
    },
  });
};

/**
 * Update an alternate group.
 */
export const useUpdateAlternateGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      groupId,
      data,
    }: {
      organizationId: string;
      groupId: string;
      data: Partial<CreateAlternateGroupInput>;
    }) => {
      return await updateAlternateGroup(organizationId, groupId, data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['alternate-groups', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['alternate-group', variables.organizationId, variables.groupId],
      });
      toast({
        title: 'Alternate group updated',
        description: `"${data.name}" has been updated.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating alternate group',
        description: error instanceof Error ? error.message : 'Failed to update group',
        variant: 'error',
      });
    },
  });
};

/**
 * Delete an alternate group.
 */
export const useDeleteAlternateGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      groupId,
    }: {
      organizationId: string;
      groupId: string;
    }) => {
      return await deleteAlternateGroup(organizationId, groupId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['alternate-groups', variables.organizationId],
      });
      toast({
        title: 'Alternate group deleted',
        description: 'The alternate group has been removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting alternate group',
        description: error instanceof Error ? error.message : 'Failed to delete group',
        variant: 'error',
      });
    },
  });
};

/**
 * Add an inventory item to an alternate group.
 */
export const useAddInventoryItemToGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      groupId,
      inventoryItemId,
      isPrimary = false,
    }: {
      organizationId: string;
      groupId: string;
      inventoryItemId: string;
      isPrimary?: boolean;
    }) => {
      return await addInventoryItemToGroup(groupId, inventoryItemId, isPrimary);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['alternate-group', variables.organizationId, variables.groupId],
      });
      // Invalidate alternates queries since group membership changed
      queryClient.invalidateQueries({
        queryKey: ['inventory-item-alternates'],
      });
      queryClient.invalidateQueries({
        queryKey: ['part-alternates'],
      });
      toast({
        title: 'Item added to group',
        description: 'The inventory item has been added to the alternate group.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error adding item to group',
        description: error instanceof Error ? error.message : 'Failed to add item',
        variant: 'error',
      });
    },
  });
};

/**
 * Add a part identifier to an alternate group.
 */
export const useAddPartIdentifierToGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      groupId,
      identifierType,
      rawValue,
      manufacturer,
      inventoryItemId,
    }: {
      organizationId: string;
      groupId: string;
      identifierType: PartIdentifierType;
      rawValue: string;
      manufacturer?: string;
      inventoryItemId?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      
      // First create the identifier
      const identifier = await createPartIdentifier(organizationId, {
        identifier_type: identifierType,
        raw_value: rawValue,
        manufacturer,
        inventory_item_id: inventoryItemId,
      });
      
      // Then add it to the group
      await addIdentifierToGroup(groupId, identifier.id);
      
      return identifier;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['alternate-group', variables.organizationId, variables.groupId],
      });
      queryClient.invalidateQueries({
        queryKey: ['part-alternates'],
      });
      toast({
        title: 'Part number added',
        description: 'The part number has been added to the alternate group.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error adding part number',
        description: error instanceof Error ? error.message : 'Failed to add part number',
        variant: 'error',
      });
    },
  });
};

/**
 * Remove a member (identifier or inventory item) from an alternate group.
 */
export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      memberId,
    }: {
      organizationId: string;
      groupId: string;
      memberId: string;
    }) => {
      return await removeGroupMember(memberId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['alternate-group', variables.organizationId, variables.groupId],
      });
      queryClient.invalidateQueries({
        queryKey: ['inventory-item-alternates'],
      });
      queryClient.invalidateQueries({
        queryKey: ['part-alternates'],
      });
      toast({
        title: 'Member removed',
        description: 'The item has been removed from the alternate group.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error removing member',
        description: error instanceof Error ? error.message : 'Failed to remove member',
        variant: 'error',
      });
    },
  });
};
