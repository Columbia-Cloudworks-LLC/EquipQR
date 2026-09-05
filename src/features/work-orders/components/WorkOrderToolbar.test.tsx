import { render, screen } from '@vitest-harness/utils/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_WORK_ORDER_FILTERS } from '@/features/work-orders/hooks/workOrderFilterUtils';
import WorkOrderToolbar from '@/features/work-orders/components/WorkOrderToolbar';

vi.mock('@/features/work-orders/components/WorkOrderFilterPopover', () => ({
  default: () => <button type="button">Filter</button>,
}));

vi.mock('@/features/work-orders/components/WorkOrderSortPopover', () => ({
  default: () => (
    <button type="button" aria-label="Sort work orders">
      Created (newest)
    </button>
  ),
}));

const toolbarProps = {
  filters: DEFAULT_WORK_ORDER_FILTERS,
  activeFilterCount: 0,
  activePresets: new Set<'my-work'>(),
  onFilterChange: vi.fn(),
  onClearFilters: vi.fn(),
  onQuickFilter: vi.fn(),
  sortField: 'created' as const,
  sortDirection: 'desc' as const,
  onSortChange: vi.fn(),
  resultCount: 22,
  totalCount: 22,
};

describe('WorkOrderToolbar', () => {
  it('keeps search and sort on the list', () => {
    render(<WorkOrderToolbar {...toolbarProps} />);

    expect(screen.getByRole('textbox', { name: 'Search work orders' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort work orders' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.getAttribute('aria-live') === 'polite' && (node.textContent ?? '').includes('22'))).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Calendar range' })).not.toBeInTheDocument();
  });

  it('hides search, sort, and result count on the calendar and shows the range control', () => {
    render(
      <WorkOrderToolbar
        {...toolbarProps}
        showSearchAndSort={false}
        rangeToggle={<div role="radiogroup" aria-label="Calendar range">Month</div>}
      />,
    );

    expect(screen.queryByRole('textbox', { name: 'Search work orders' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sort work orders' })).not.toBeInTheDocument();
    expect(screen.queryByText((_, node) => node?.getAttribute('aria-live') === 'polite')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Calendar range' })).toBeInTheDocument();
  });
});
