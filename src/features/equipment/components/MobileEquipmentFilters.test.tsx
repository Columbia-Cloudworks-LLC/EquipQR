import React from 'react';
import { render, screen, fireEvent } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileEquipmentFilters } from './MobileEquipmentFilters';
import { EquipmentFilters } from '@/features/equipment/hooks/useEquipmentFiltering';

/**
 * Mobile wiring smoke tests. Filter/sort logic lives in useEquipmentFiltering
 * (unit-tested). Keep Radix Select/Sheet churn minimal here.
 */
const defaultFilters: EquipmentFilters = {
  search: '',
  status: 'all',
  manufacturer: 'all',
  location: 'all',
  team: 'all',
  maintenanceDateFrom: null,
  maintenanceDateTo: null,
  installationDateFrom: null,
  installationDateTo: null,
  warrantyExpiring: false,
};

const defaultFilterOptions = {
  manufacturers: ['Toyota', 'Caterpillar'],
  locations: ['Warehouse A', 'Warehouse B'],
};

describe('MobileEquipmentFilters', () => {
  const mockOnFilterChange = vi.fn();
  const mockOnClearFilters = vi.fn();
  const mockOnQuickFilter = vi.fn();
  const mockOnShowMobileFiltersChange = vi.fn();
  const mockOnSortChange = vi.fn();

  const defaultProps = {
    filters: defaultFilters,
    activeFilterCount: 0,
    showMobileFilters: false,
    onShowMobileFiltersChange: mockOnShowMobileFiltersChange,
    onFilterChange: mockOnFilterChange,
    onClearFilters: mockOnClearFilters,
    onQuickFilter: mockOnQuickFilter,
    filterOptions: defaultFilterOptions,
    sortConfig: { field: 'name', direction: 'asc' as const },
    onSortChange: mockOnSortChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search and filter/personalization icon buttons', () => {
    render(<MobileEquipmentFilters {...defaultProps} />);

    expect(screen.getByPlaceholderText('Search equipment...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open filters/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open personalization/i })).toBeInTheDocument();
    expect(screen.queryByText('Maintenance Due')).not.toBeInTheDocument();
  });

  it('wires search to onFilterChange', () => {
    render(<MobileEquipmentFilters {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Search equipment...'), {
      target: { value: 'forklift' },
    });
    expect(mockOnFilterChange).toHaveBeenCalledWith('search', 'forklift');
  });

  it('opens filter sheet via button and wires showMobileFiltersChange', () => {
    render(<MobileEquipmentFilters {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /open filters/i }));
    expect(mockOnShowMobileFiltersChange).toHaveBeenCalled();
  });

  it('shows filter sheet content, quick filters, clear, and omits Team filter', () => {
    render(<MobileEquipmentFilters {...defaultProps} showMobileFilters={true} />);

    expect(screen.getByText('Filter Equipment')).toBeInTheDocument();
    expect(screen.getByText('Maintenance Due')).toBeInTheDocument();
    expect(screen.queryByText('Team')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Maintenance Due'));
    expect(mockOnQuickFilter).toHaveBeenCalledWith('maintenance-due');

    fireEvent.click(screen.getByText('Clear All Filters'));
    expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
  });

  it('opens personalization sheet for sort controls', async () => {
    render(<MobileEquipmentFilters {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /open personalization/i }));
    expect(await screen.findByText('Personalize list')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort equipment by field')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /list view/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /card view/i })).not.toBeInTheDocument();
  });

  it('shows active filter badges and omits Team badge (TopBar owns team scope)', () => {
    render(
      <MobileEquipmentFilters
        {...defaultProps}
        activeFilterCount={2}
        filters={{ ...defaultFilters, status: 'active', manufacturer: 'Toyota', team: 'team-1' }}
      />,
    );

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/Status: active/i)).toBeInTheDocument();
    expect(screen.getByText(/Manufacturer: Toyota/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Team:/i)).not.toBeInTheDocument();
  });
});
