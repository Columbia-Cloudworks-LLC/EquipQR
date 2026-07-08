import { useQuery } from '@tanstack/react-query';
import {
  listQuickFormSubmissions,
  type QuickFormSubmissionFilters,
} from '@/features/quick-forms/services/quickFormSubmissionsService';
import { quickFormKeys } from './quickFormKeys';

export function useQuickFormSubmissions(
  organizationId: string | undefined,
  filters: QuickFormSubmissionFilters = {},
) {
  return useQuery({
    queryKey: quickFormKeys.submissions(organizationId, filters),
    queryFn: () => listQuickFormSubmissions(organizationId!, filters),
    enabled: !!organizationId,
  });
}
