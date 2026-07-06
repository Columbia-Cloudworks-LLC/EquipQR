import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEquipmentOperatorCheckinAssignment,
  deleteEquipmentOperatorCheckinAssignment,
  getOperatorCheckinToken,
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

/**
 * Server-persisted raw QR token for one assignment (#1154). Admin-only via
 * RLS; members and legacy pre-persistence assignments resolve to null.
 * Create/rotate mutations seed this cache so the QR dialog updates instantly.
 */
export function useOperatorCheckinToken(
  assignmentId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: operatorCheckinKeys.token(assignmentId ?? ''),
    queryFn: () => getOperatorCheckinToken(assignmentId!),
    enabled: Boolean(assignmentId && (options?.enabled ?? true)),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEquipmentOperatorCheckinAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEquipmentOperatorCheckinAssignment,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(operatorCheckinKeys.token(data.assignment.id), data.rawToken);
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
    onSuccess: (_data, assignmentId) => {
      queryClient.removeQueries({ queryKey: operatorCheckinKeys.token(assignmentId) });
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
    onSuccess: (rawToken, assignmentId) => {
      queryClient.setQueryData(operatorCheckinKeys.token(assignmentId), rawToken);
      void queryClient.invalidateQueries({
        queryKey: operatorCheckinKeys.equipmentAssignments(equipmentId, organizationId),
      });
    },
  });
}
