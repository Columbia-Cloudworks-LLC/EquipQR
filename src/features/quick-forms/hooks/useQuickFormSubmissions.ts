import { useInfiniteQuery } from '@tanstack/react-query';
import {
  listQuickFormSubmissionPage,
  QUICK_FORM_LEDGER_PAGE_SIZE,
  type QuickFormSubmissionCursor,
  type QuickFormSubmissionFilters,
} from '@/features/quick-forms/services/quickFormSubmissionsService';
import { quickFormKeys } from './quickFormKeys';
import { requireOrganizationId } from './requireOrganizationId';

export function useQuickFormSubmissions(
  organizationId: string | undefined,
  filters: QuickFormSubmissionFilters = {},
) {
  return useInfiniteQuery({
    queryKey: quickFormKeys.submissions(organizationId, filters),
    queryFn: ({ pageParam }) =>
      listQuickFormSubmissionPage(
        requireOrganizationId(organizationId),
        filters,
        pageParam,
        QUICK_FORM_LEDGER_PAGE_SIZE,
      ),
    initialPageParam: null as QuickFormSubmissionCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!organizationId,
  });
}
