import { useQuery } from '@tanstack/react-query';
import { pmIntervalPolicyService } from '@/features/pm-templates/services/pmIntervalPolicyService';
import { queryKeys } from '@/lib/queryKeys';

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
