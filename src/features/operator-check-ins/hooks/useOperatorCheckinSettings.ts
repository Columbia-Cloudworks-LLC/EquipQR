import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEquipmentOperatorCheckinAssignment,
  deleteEquipmentOperatorCheckinAssignment,
  listEquipmentOperatorCheckinAssignments,
  listOrganizationOperatorCheckinAssignments,
  rotateOperatorCheckinToken,
} from '@/features/operator-check-ins/services/operatorCheckinSettingsService';
import { operatorCheckinKeys } from '@/features/operator-check-ins/hooks/operatorCheckinKeys';

function invalidateAssignmentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  equipmentId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: operatorCheckinKeys.equipmentAssignments(equipmentId, organizationId),
  });
  void queryClient.invalidateQueries({
    queryKey: operatorCheckinKeys.organizationAssignments(organizationId),
  });
}

export function useEquipmentOperatorCheckinAssignments(
  equipmentId: string | undefined,
  organizationId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: operatorCheckinKeys.equipmentAssignments(equipmentId ?? '', organizationId ?? ''),
    queryFn: () => listEquipmentOperatorCheckinAssignments(equipmentId!, organizationId!),
    enabled: Boolean(equipmentId && organizationId && (options?.enabled ?? true)),
  });
}

export function useOrganizationOperatorCheckinAssignments(organizationId: string | undefined) {
  return useQuery({
    queryKey: operatorCheckinKeys.organizationAssignments(organizationId ?? ''),
    queryFn: () => listOrganizationOperatorCheckinAssignments(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useCreateEquipmentOperatorCheckinAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEquipmentOperatorCheckinAssignment,
    onSuccess: (_data, variables) => {
      invalidateAssignmentQueries(queryClient, variables.organizationId, variables.equipmentId);
    },
  });
}

export function useDeleteEquipmentOperatorCheckinAssignment(
  equipmentId: string,
  organizationId?: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEquipmentOperatorCheckinAssignment,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: operatorCheckinKeys.equipmentAssignments(equipmentId, organizationId ?? ''),
      });
      if (organizationId) {
        void queryClient.invalidateQueries({
          queryKey: operatorCheckinKeys.organizationAssignments(organizationId),
        });
      }
    },
  });
}

export function useRotateOperatorCheckinToken(equipmentId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rotateOperatorCheckinToken,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: operatorCheckinKeys.equipmentAssignments(equipmentId, organizationId),
      });
    },
  });
}
