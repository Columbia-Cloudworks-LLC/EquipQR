import type { LandscapeCase, LandscapeFilters } from '@/pages/legal/right-to-repair/types';

export const EMPTY_LANDSCAPE_FILTERS: LandscapeFilters = {
  lens: 'all',
  sector: 'all',
  mechanism: 'all',
  query: '',
};

export function filterLandscapeCases(
  cases: readonly LandscapeCase[],
  filters: LandscapeFilters,
): LandscapeCase[] {
  const query = filters.query.trim().toLowerCase();

  return cases.filter((item) => {
    if (filters.lens !== 'all' && !item.lenses.includes(filters.lens)) {
      return false;
    }
    if (filters.sector !== 'all' && item.sector !== filters.sector) {
      return false;
    }
    if (filters.mechanism !== 'all' && !item.mechanisms.includes(filters.mechanism)) {
      return false;
    }
    if (!query) {
      return true;
    }
    const haystack = [item.title, item.vendor, item.practice, item.harm]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}
