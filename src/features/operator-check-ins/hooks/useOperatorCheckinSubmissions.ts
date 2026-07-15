import { useQuery } from '@tanstack/react-query';
import {
  listOperatorCheckinSubmissions,
  listOperatorCheckinTemplateIdsWithSubmissions,
  type OperatorCheckinSubmissionFilters,
} from '@/features/operator-check-ins/services/operatorCheckinSubmissionsService';
import { operatorCheckinKeys } from '@/features/operator-check-ins/hooks/operatorCheckinKeys';

function filtersKey(filters: OperatorCheckinSubmissionFilters): string {
  return JSON.stringify(filters);
}

export function useOperatorCheckinSubmissions(
  organizationId: string | undefined,
  filters: OperatorCheckinSubmissionFilters,
  queryEnabled = true,
) {
  return useQuery({
    queryKey: operatorCheckinKeys.submissions(organizationId ?? '', filtersKey(filters)),
    queryFn: () => listOperatorCheckinSubmissions(organizationId!, filters),
    enabled: Boolean(organizationId) && queryEnabled,
  });
}

export function useOperatorCheckinTemplateIdsWithSubmissions(organizationId: string | undefined) {
  return useQuery({
    queryKey: operatorCheckinKeys.templateIdsWithSubmissions(organizationId ?? ''),
    queryFn: () => listOperatorCheckinTemplateIdsWithSubmissions(organizationId!),
    enabled: Boolean(organizationId),
  });
}
