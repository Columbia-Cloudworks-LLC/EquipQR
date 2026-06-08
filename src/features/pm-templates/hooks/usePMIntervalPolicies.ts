import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  pmIntervalPolicyService,
  type PMIntervalPolicyScopeType,
  type PMSchedulePolicyFormState,
} from '@/features/pm-templates/services/pmIntervalPolicyService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

type PolicyTarget =
  | { scopeType: 'equipment'; equipmentId: string }
  | { scopeType: 'team'; teamId: string }
  | { scopeType: 'template'; templateId: string };

function policyQueryKey(organizationId: string, target: PolicyTarget) {
  switch (target.scopeType) {
    case 'equipment':
      return queryKeys.pmIntervalPolicies.byEquipment(organizationId, target.equipmentId);
    case 'team':
      return queryKeys.pmIntervalPolicies.byTeam(organizationId, target.teamId);
    case 'template':
      return queryKeys.pmIntervalPolicies.byTemplate(organizationId, target.templateId);
  }
}

function invalidatePolicyQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  target: PolicyTarget
) {
  queryClient.invalidateQueries({ queryKey: policyQueryKey(organizationId, target) });
  queryClient.invalidateQueries({ queryKey: queryKeys.pmIntervalPolicies.byOrg(organizationId) });

  if (target.scopeType === 'equipment') {
    queryClient.invalidateQueries({ queryKey: queryKeys.pmStatus.byEquipment(target.equipmentId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.pmStatus.byOrg(organizationId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.equipment.pmStatus(target.equipmentId) });
  } else if (target.scopeType === 'team') {
    queryClient.invalidateQueries({ queryKey: queryKeys.pmStatus.byOrg(organizationId) });
    queryClient.invalidateQueries({ queryKey: ['teams', organizationId] });
    queryClient.invalidateQueries({ queryKey: ['team', target.teamId] });
  } else {
    queryClient.invalidateQueries({ queryKey: queryKeys.pmTemplates.list(organizationId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.pmTemplates.byId(target.templateId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.pmStatus.byOrg(organizationId) });
  }
}

export function usePMIntervalPolicy(
  organizationId: string | undefined,
  target: PolicyTarget | null,
  options: { enabled?: boolean } = {}
) {
  const enabled = (options.enabled ?? true) && !!organizationId && !!target;

  return useQuery({
    queryKey: target && organizationId
      ? policyQueryKey(organizationId, target)
      : ['pm-interval-policies', 'disabled'],
    queryFn: () => pmIntervalPolicyService.getPolicy(organizationId!, target!),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpsertPMIntervalPolicy(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      target,
      form,
    }: {
      target: PolicyTarget;
      form: PMSchedulePolicyFormState;
    }) => {
      if (!organizationId) throw new Error('Organization not found');
      return pmIntervalPolicyService.upsertPolicy(organizationId, target, form);
    },
    onSuccess: (_data, variables) => {
      if (!organizationId) return;
      invalidatePolicyQueries(queryClient, organizationId, variables.target);
      toast.success('PM schedule updated');
    },
    onError: () => {
      toast.error('Failed to update PM schedule');
    },
  });
}
