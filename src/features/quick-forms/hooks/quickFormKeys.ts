/** Query key factories for the quick forms domain (#1184). */

import type { QuickFormSubmissionFilters } from '@/features/quick-forms/services/quickFormSubmissionsService';

export const quickFormKeys = {
  all: ['quick-forms'] as const,
  list: (organizationId: string | undefined) =>
    [...quickFormKeys.all, 'list', organizationId ?? 'none'] as const,
  submissions: (
    organizationId: string | undefined,
    filters: QuickFormSubmissionFilters = {},
  ) =>
    [
      ...quickFormKeys.all,
      'submissions',
      organizationId ?? 'none',
      filters.quickFormId ?? 'all',
      filters.dateFrom ?? 'any',
      filters.dateTo ?? 'any',
    ] as const,
};
