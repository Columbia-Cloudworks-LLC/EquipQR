import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  getInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustInventoryQuantity,
  getInventoryTransactions,
  getCompatibleInventoryItems,
  getInventoryItemManagers,
  assignInventoryManagers,
  DEFAULT_TRANSACTION_LIMIT,
  type TransactionPaginationParams,
  type PaginatedTransactionsResult
} from '@/features/inventory/services/inventoryService';
import {
  linkItemToEquipment,
  unlinkItemFromEquipment,
  getCompatibleEquipmentForItem,
  bulkLinkEquipmentToItem
} from '@/features/inventory/services/inventoryCompatibilityService';
import {
  getCompatibilityRulesForItem,
  addCompatibilityRule,
  removeCompatibilityRule,
  bulkSetCompatibilityRules,
  countEquipmentMatchingRules
} from '@/features/inventory/services/inventoryCompatibilityRulesService';
import type {
  InventoryQuantityAdjustment,
  InventoryFilters,
  PartCompatibilityRule,
  PartCompatibilityRuleFormData
} from '@/features/inventory/types/inventory';
import type { InventoryItemFormData } from '@/features/inventory/schemas/inventorySchema';
import { useAppToast } from '@/hooks/useAppToast';

const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes

// ============================================
// Query Hooks
// ============================================

export const useInventoryItems = (
  organizationId: string | undefined,
  filters: InventoryFilters = {},
  options?: {
    staleTime?: number;
  }
) => {
  const staleTime = options?.staleTime ?? DEFAULT_STALE_TIME;

  return useQuery({
    queryKey: ['inventory-items', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return [];
      return await getInventoryItems(organizationId, filters);
    },
    enabled: !!organizationId,
    staleTime
  });
};

export const useInventoryItem = (
  organizationId: string | undefined,
  itemId: string | undefined,
  options?: {
    staleTime?: number;
  }
) => {
  const staleTime = options?.staleTime ?? DEFAULT_STALE_TIME;

  return useQuery({
    queryKey: ['inventory-item', organizationId, itemId],
    queryFn: async () => {
      if (!organizationId || !itemId) return null;
      return await getInventoryItemById(organizationId, itemId);
    },
    enabled: !!organizationId && !!itemId,
    staleTime
  });
};

const EMPTY_PAGINATED_RESULT: PaginatedTransactionsResult = {
  transactions: [],
  totalCount: 0,
  page: 1,
  limit: DEFAULT_TRANSACTION_LIMIT,
  hasMore: false
};

export const useInventoryTransactions = (
  organizationId: string | undefined,
  itemId?: string,
  options?: {
    staleTime?: number;
    pagination?: TransactionPaginationParams;
  }
) => {
  const staleTime = options?.staleTime ?? 2 * 60 * 1000; // 2 minutes for transactions
  const pagination = options?.pagination;

  return useQuery({
    queryKey: ['inventory-transactions', organizationId, itemId, pagination?.page, pagination?.limit],
    queryFn: async () => {
      if (!organizationId) return EMPTY_PAGINATED_RESULT;
      return await getInventoryTransactions(organizationId, itemId, pagination);
    },
    enabled: !!organizationId,
    staleTime
  });
};

export const useCompatibleInventoryItems = (
  organizationId: string | undefined,
  equipmentIds: string[],
  options?: {
    staleTime?: number;
  }
) => {
  const staleTime = options?.staleTime ?? DEFAULT_STALE_TIME;

  // Create stable sorted key using useMemo to avoid recomputation on every render
  // This ensures the key only changes when IDs change, not when array reference changes
  const sortedKey = useMemo(() => {
    return equipmentIds.length > 0 
      ? [...equipmentIds].sort().join(',')
      : '';
  }, [equipmentIds]);

  return useQuery({
    queryKey: ['compatible-inventory-items', organizationId, sortedKey],
    queryFn: async () => {
      if (!organizationId || equipmentIds.length === 0) return [];
      return await getCompatibleInventoryItems(organizationId, equipmentIds);
    },
    enabled: !!organizationId && equipmentIds.length > 0,
    staleTime
  });
};

export const useInventoryItemManagers = (
  organizationId: string | undefined,
  itemId: string | undefined,
  options?: {
    staleTime?: number;
  }
) => {
  const staleTime = options?.staleTime ?? DEFAULT_STALE_TIME;

  return useQuery({
    queryKey: ['inventory-item-managers', organizationId, itemId],
    queryFn: async () => {
      if (!organizationId || !itemId) return [];
      return await getInventoryItemManagers(organizationId, itemId);
    },
    enabled: !!organizationId && !!itemId,
    staleTime
  });
};

export const useCompatibleEquipmentForItem = (
  organizationId: string | undefined,
  itemId: string | undefined,
  options?: {
    staleTime?: number;
  }
) => {
  const staleTime = options?.staleTime ?? DEFAULT_STALE_TIME;

  return useQuery({
    queryKey: ['compatible-equipment', organizationId, itemId],
    queryFn: async () => {
      if (!organizationId || !itemId) return [];
      return await getCompatibleEquipmentForItem(organizationId, itemId);
    },
    enabled: !!organizationId && !!itemId,
    staleTime
  });
};

// ============================================
// Mutation Hooks
// ============================================

export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      formData
    }: {
      organizationId: string;
      formData: InventoryItemFormData;
    }) => {
      if (!user) throw new Error('User not authenticated');
      return await createInventoryItem(organizationId, formData, user.id);
    },
    onSuccess: (data, variables) => {
      // Invalidate inventory items list
      queryClient.invalidateQueries({
        queryKey: ['inventory-items', variables.organizationId]
      });
      toast({
        title: 'Inventory item created',
        description: `${data.name} has been added to inventory.`
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating inventory item',
        description: error instanceof Error ? error.message : 'Failed to create inventory item',
        variant: 'error'
      });
    }
  });
};

export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      itemId,
      formData
    }: {
      organizationId: string;
      itemId: string;
      formData: Partial<InventoryItemFormData>;
    }) => {
      return await updateInventoryItem(organizationId, itemId, formData);
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['inventory-items', variables.organizationId]
      });
      queryClient.invalidateQueries({
        queryKey: ['inventory-item', variables.organizationId, variables.itemId]
      });
      toast({
        title: 'Inventory item updated',
        description: `${data.name} has been updated.`
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating inventory item',
        description: error instanceof Error ? error.message : 'Failed to update inventory item',
        variant: 'error'
      });
    }
  });
};

export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      itemId
    }: {
      organizationId: string;
      itemId: string;
    }) => {
      return await deleteInventoryItem(organizationId, itemId);
    },
    onSuccess: (_, variables) => {
      // Invalidate inventory items list
      queryClient.invalidateQueries({
        queryKey: ['inventory-items', variables.organizationId]
      });
      toast({
        title: 'Inventory item deleted',
        description: 'The inventory item has been removed.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting inventory item',
        description: error instanceof Error ? error.message : 'Failed to delete inventory item',
        variant: 'error'
      });
    }
  });
};

export const useAdjustInventoryQuantity = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      adjustment
    }: {
      organizationId: string;
      adjustment: InventoryQuantityAdjustment;
    }) => {
      if (!user) throw new Error('User not authenticated');
      return await adjustInventoryQuantity(organizationId, adjustment);
    },
    onSuccess: (newQuantity, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['inventory-items', variables.organizationId]
      });
      queryClient.invalidateQueries({
        queryKey: ['inventory-item', variables.organizationId, variables.adjustment.itemId]
      });
      // Invalidate all transaction queries for this item (uses TanStack Query's partial key matching,
      // which will match any query key that starts with these elements regardless of pagination params)
      queryClient.invalidateQueries({
        queryKey: ['inventory-transactions', variables.organizationId, variables.adjustment.itemId]
      });

      // Show warning if quantity is negative
      if (newQuantity < 0) {
        toast({
          title: 'Inventory adjusted',
          description: `Quantity is now negative: ${newQuantity}`,
          variant: 'warning'
        });
      } else {
        toast({
          title: 'Inventory adjusted',
          description: `New quantity: ${newQuantity}`
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error adjusting inventory',
        description: error instanceof Error ? error.message : 'Failed to adjust inventory quantity',
        variant: 'error'
      });
    }
  });
};

export const useAssignInventoryManagers = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      itemId,
      userIds
    }: {
      organizationId: string;
      itemId: string;
      userIds: string[];
    }) => {
      return await assignInventoryManagers(organizationId, itemId, userIds);
    },
    onSuccess: (_, variables) => {
      // Invalidate managers query
      queryClient.invalidateQueries({
        queryKey: ['inventory-item-managers', variables.organizationId, variables.itemId]
      });
      queryClient.invalidateQueries({
        queryKey: ['inventory-item', variables.organizationId, variables.itemId]
      });
      toast({
        title: 'Managers updated',
        description: 'Inventory item managers have been updated.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating managers',
        description: error instanceof Error ? error.message : 'Failed to update managers',
        variant: 'error'
      });
    }
  });
};

export const useLinkItemToEquipment = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      itemId,
      equipmentId
    }: {
      organizationId: string;
      itemId: string;
      equipmentId: string;
    }) => {
      return await linkItemToEquipment(organizationId, itemId, equipmentId);
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to refetch compatible equipment
      queryClient.invalidateQueries({
        queryKey: ['compatible-equipment', variables.organizationId, variables.itemId]
      });
      queryClient.invalidateQueries({
        queryKey: ['inventory-item', variables.organizationId, variables.itemId]
      });
      // Invalidate compatible items queries for equipment detail pages
      queryClient.invalidateQueries({
        queryKey: ['compatible-inventory-items', variables.organizationId]
      });
      toast({
        title: 'Equipment linked',
        description: 'Equipment has been added to compatibility list.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error linking equipment',
        description: error instanceof Error ? error.message : 'Failed to link equipment',
        variant: 'error'
      });
    }
  });
};

export const useUnlinkItemFromEquipment = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      itemId,
      equipmentId
    }: {
      organizationId: string;
      itemId: string;
      equipmentId: string;
    }) => {
      return await unlinkItemFromEquipment(organizationId, itemId, equipmentId);
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to refetch compatible equipment
      queryClient.invalidateQueries({
        queryKey: ['compatible-equipment', variables.organizationId, variables.itemId]
      });
      queryClient.invalidateQueries({
        queryKey: ['inventory-item', variables.organizationId, variables.itemId]
      });
      // Invalidate compatible items queries for equipment detail pages
      queryClient.invalidateQueries({
        queryKey: ['compatible-inventory-items', variables.organizationId]
      });
      toast({
        title: 'Equipment unlinked',
        description: 'Equipment has been removed from compatibility list.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error unlinking equipment',
        description: error instanceof Error ? error.message : 'Failed to unlink equipment',
        variant: 'error'
      });
    }
  });
};

export const useBulkLinkEquipmentToItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      itemId,
      equipmentIds
    }: {
      organizationId: string;
      itemId: string;
      equipmentIds: string[];
    }) => {
      return await bulkLinkEquipmentToItem(organizationId, itemId, equipmentIds);
    },
    onSuccess: (result, variables) => {
      // Invalidate queries to refetch compatible equipment
      queryClient.invalidateQueries({
        queryKey: ['compatible-equipment', variables.organizationId, variables.itemId]
      });
      queryClient.invalidateQueries({
        queryKey: ['inventory-item', variables.organizationId, variables.itemId]
      });
      // Invalidate compatible items queries for equipment detail pages
      queryClient.invalidateQueries({
        queryKey: ['compatible-inventory-items', variables.organizationId]
      });
      
      // Show summary toast with counts
      const { added, removed } = result;
      const messages = [];
      if (added > 0) messages.push(`${added} added`);
      if (removed > 0) messages.push(`${removed} removed`);
      
      toast({
        title: 'Equipment compatibility updated',
        description: messages.length > 0 ? messages.join(', ') : 'No changes made'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating equipment compatibility',
        description: error instanceof Error ? error.message : 'Failed to update equipment compatibility',
        variant: 'error'
      });
    }
  });
};

// ============================================
// Compatibility Rules Hooks
// ============================================

/**
 * Hook to fetch compatibility rules for an inventory item.
 */
export const useCompatibilityRulesForItem = (
  organizationId: string | undefined,
  itemId: string | undefined,
  options?: {
    staleTime?: number;
  }
) => {
  const staleTime = options?.staleTime ?? DEFAULT_STALE_TIME;

  return useQuery({
    queryKey: ['compatibility-rules', organizationId, itemId],
    queryFn: async (): Promise<PartCompatibilityRule[]> => {
      if (!organizationId || !itemId) return [];
      return await getCompatibilityRulesForItem(organizationId, itemId);
    },
    enabled: !!organizationId && !!itemId,
    staleTime
  });
};

/**
 * Hook to add a single compatibility rule.
 */
export const useAddCompatibilityRule = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      itemId,
      rule
    }: {
      organizationId: string;
      itemId: string;
      rule: PartCompatibilityRuleFormData;
    }) => {
      return await addCompatibilityRule(organizationId, itemId, rule);
    },
    onSuccess: (_, variables) => {
      // Invalidate rules query
      queryClient.invalidateQueries({
        queryKey: ['compatibility-rules', variables.organizationId, variables.itemId]
      });
      // Invalidate compatible items queries (rules affect what's compatible)
      queryClient.invalidateQueries({
        queryKey: ['compatible-inventory-items', variables.organizationId]
      });
      toast({
        title: 'Compatibility rule added',
        description: 'The manufacturer/model rule has been added.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error adding compatibility rule',
        description: error instanceof Error ? error.message : 'Failed to add rule',
        variant: 'error'
      });
    }
  });
};

/**
 * Hook to remove a compatibility rule.
 */
export const useRemoveCompatibilityRule = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      itemId,
      ruleId
    }: {
      organizationId: string;
      itemId: string;
      ruleId: string;
    }) => {
      // itemId is passed through to onSuccess for cache invalidation
      void itemId;
      return await removeCompatibilityRule(organizationId, ruleId);
    },
    onSuccess: (_, variables) => {
      // Invalidate rules query
      queryClient.invalidateQueries({
        queryKey: ['compatibility-rules', variables.organizationId, variables.itemId]
      });
      // Invalidate compatible items queries
      queryClient.invalidateQueries({
        queryKey: ['compatible-inventory-items', variables.organizationId]
      });
      toast({
        title: 'Compatibility rule removed',
        description: 'The manufacturer/model rule has been removed.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error removing compatibility rule',
        description: error instanceof Error ? error.message : 'Failed to remove rule',
        variant: 'error'
      });
    }
  });
};

/**
 * Hook to bulk set (replace) all compatibility rules for an item.
 */
export const useBulkSetCompatibilityRules = () => {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async ({
      organizationId,
      itemId,
      rules
    }: {
      organizationId: string;
      itemId: string;
      rules: PartCompatibilityRuleFormData[];
    }) => {
      return await bulkSetCompatibilityRules(organizationId, itemId, rules);
    },
    onSuccess: (result, variables) => {
      // Invalidate rules query
      queryClient.invalidateQueries({
        queryKey: ['compatibility-rules', variables.organizationId, variables.itemId]
      });
      // Invalidate compatible items queries
      queryClient.invalidateQueries({
        queryKey: ['compatible-inventory-items', variables.organizationId]
      });
      
      toast({
        title: 'Compatibility rules updated',
        description: `${result.rulesSet} rule${result.rulesSet !== 1 ? 's' : ''} set`
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating compatibility rules',
        description: error instanceof Error ? error.message : 'Failed to update rules',
        variant: 'error'
      });
    }
  });
};

/**
 * Hook to count equipment matching a set of rules.
 * Used for displaying match count in the UI.
 */
export const useEquipmentMatchCount = (
  organizationId: string | undefined,
  rules: PartCompatibilityRuleFormData[],
  options?: {
    staleTime?: number;
  }
) => {
  const staleTime = options?.staleTime ?? 30 * 1000; // 30 seconds for count

  // Create a stable key from rules
  const rulesKey = useMemo(() => {
    if (rules.length === 0) return '';
    return rules
      .map(r => `${r.manufacturer.toLowerCase().trim()}|${r.model?.toLowerCase().trim() ?? ''}`)
      .sort()
      .join(',');
  }, [rules]);

  return useQuery({
    queryKey: ['equipment-match-count', organizationId, rulesKey],
    queryFn: async () => {
      if (!organizationId || rules.length === 0) return 0;
      return await countEquipmentMatchingRules(organizationId, rules);
    },
    enabled: !!organizationId && rules.length > 0,
    staleTime
  });
};
