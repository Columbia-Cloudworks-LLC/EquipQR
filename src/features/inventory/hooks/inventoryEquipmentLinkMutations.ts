import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppToast } from '@/hooks/useAppToast';
import {
  unlinkItemFromEquipment,
} from '@/features/inventory/services/inventoryCompatibilityService';

type LinkVariables = {
  organizationId: string;
  itemId: string;
  equipmentId: string;
};

export function invalidateEquipmentLinkQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  variables: LinkVariables,
) {
  queryClient.invalidateQueries({
    queryKey: ['compatible-equipment', variables.organizationId, variables.itemId],
  });
  queryClient.invalidateQueries({
    queryKey: ['inventory-item', variables.organizationId, variables.itemId],
  });
  queryClient.invalidateQueries({
    queryKey: ['compatible-inventory-items', variables.organizationId],
  });
}

export function useUnlinkItemFromEquipment() {
  const queryClient = useQueryClient();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async (variables: LinkVariables) =>
      unlinkItemFromEquipment(variables.organizationId, variables.itemId, variables.equipmentId),
    onSuccess: (_, variables) => {
      invalidateEquipmentLinkQueries(queryClient, variables);
      toast({
        title: 'Equipment unlinked',
        description: 'Equipment has been removed from compatibility list.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error unlinking equipment',
        description: error instanceof Error ? error.message : 'Failed to unlink equipment',
        variant: 'error',
      });
    },
  });
}
