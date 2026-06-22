import React from 'react';
import { render, screen, fireEvent, within } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileEquipmentFilters } from '../MobileEquipmentFilters';
import { EquipmentFilters } from '@/features/equipment/hooks/useEquipmentFiltering';

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
  const mockOnViewModeChange = vi.fn();

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
    viewMode: 'grid' as const,
    onViewModeChange: mockOnViewModeChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders search input', () => {
      render(<MobileEquipmentFilters {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search equipment...');
      expect(searchInput).toBeInTheDocument();
    });

    it('renders filter and personalization icon buttons', () => {
      render(<MobileEquipmentFilters {...defaultProps} />);

      expect(screen.getByRole('button', { name: /open filters/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /open personalization/i })).toBeInTheDocument();
    });

    it('does not render quick filter chips outside the filter sheet', () => {
      render(<MobileEquipmentFilters {...defaultProps} />);

      expect(screen.queryByText('Maintenance Due')).not.toBeInTheDocument();
      expect(screen.queryByText('Warranty Expiring')).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('displays current search value', () => {
      render(
        <MobileEquipmentFilters
          {...defaultProps}
          filters={{ ...defaultFilters, search: 'test query' }}
        />,
      );

      const searchInput = screen.getByPlaceholderText('Search equipment...') as HTMLInputElement;
      expect(searchInput.value).toBe('test query');
    });

    it('calls onFilterChange when search input changes', () => {
      render(<MobileEquipmentFilters {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search equipment...');
      fireEvent.change(searchInput, { target: { value: 'forklift' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith('search', 'forklift');
    });
  });

  describe('Quick Filters in Filter Sheet', () => {
    beforeEach(() => {
      render(<MobileEquipmentFilters {...defaultProps} showMobileFilters={true} />);
    });

    it('renders quick filter buttons inside the filter sheet', () => {
      expect(screen.getByText('Maintenance Due')).toBeInTheDocument();
      expect(screen.getByText('Warranty Expiring')).toBeInTheDocument();
      expect(screen.getByText('Recently Added')).toBeInTheDocument();
      expect(screen.getByText('Active Only')).toBeInTheDocument();
    });

    it('calls onQuickFilter when quick filter button is clicked', () => {
      fireEvent.click(screen.getByText('Maintenance Due'));

      expect(mockOnQuickFilter).toHaveBeenCalledWith('maintenance-due');
    });

    it('calls onQuickFilter with correct preset values', () => {
      fireEvent.click(screen.getByText('Warranty Expiring'));
      expect(mockOnQuickFilter).toHaveBeenCalledWith('warranty-expiring');

      fireEvent.click(screen.getByText('Recently Added'));
      expect(mockOnQuickFilter).toHaveBeenCalledWith('recently-added');

      fireEvent.click(screen.getByText('Active Only'));
      expect(mockOnQuickFilter).toHaveBeenCalledWith('active-only');
    });
  });

  describe('Personalization Sheet', () => {
    it('opens personalization sheet when icon button is clicked', async () => {
      render(<MobileEquipmentFilters {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /open personalization/i }));

      expect(await screen.findByText('Personalize list')).toBeInTheDocument();
    });

    it('shows badge when sort is non-default', () => {
      render(
        <MobileEquipmentFilters
          {...defaultProps}
          sortConfig={{ field: 'created_at', direction: 'desc' }}
        />,
      );

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('calls onSortChange when sort field is selected', async () => {
      render(<MobileEquipmentFilters {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /open personalization/i }));
      await screen.findByText('Personalize list');

      const sortSelect = screen.getByRole('combobox', { name: /sort equipment by field/i });
      fireEvent.click(sortSelect);

      const listbox = await screen.findByRole('listbox');
      fireEvent.click(within(listbox).getByRole('option', { name: 'Created Date' }));

      expect(mockOnSortChange).toHaveBeenCalledWith('created_at', 'desc');
    });

    it('calls onSortChange when sort order toggle is clicked', async () => {
      render(<MobileEquipmentFilters {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /open personalization/i }));
      await screen.findByText('Personalize list');

      fireEvent.click(screen.getByRole('button', { name: /a to z, tap for z to a/i }));

      expect(mockOnSortChange).toHaveBeenCalledWith('name', 'desc');
    });

    it('calls onViewModeChange when list view is selected', async () => {
      render(<MobileEquipmentFilters {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /open personalization/i }));
      await screen.findByText('Personalize list');

      fireEvent.click(screen.getByRole('radio', { name: /list view/i }));

      expect(mockOnViewModeChange).toHaveBeenCalledWith('list');
    });
  });

  describe('Filter Sheet', () => {
    it('opens filter sheet when filters button is clicked', async () => {
      render(<MobileEquipmentFilters {...defaultProps} />);

      const filtersButton = screen.getByRole('button', { name: /open filters/i });
      fireEvent.click(filtersButton);

      await screen.findByText('Filter Equipment');
      expect(screen.getByText('Filter Equipment')).toBeInTheDocument();
    });

    it('shows active filter count badge when activeFilterCount > 0', () => {
      render(<MobileEquipmentFilters {...defaultProps} activeFilterCount={3} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('does not show badge when activeFilterCount is 0', () => {
      render(<MobileEquipmentFilters {...defaultProps} activeFilterCount={0} />);

      const badge = screen.queryByText('0');
      expect(badge).not.toBeInTheDocument();
    });

    it('calls onShowMobileFiltersChange when sheet opens', () => {
      render(<MobileEquipmentFilters {...defaultProps} />);

      const filtersButton = screen.getByRole('button', { name: /open filters/i });
      fireEvent.click(filtersButton);

      expect(mockOnShowMobileFiltersChange).toHaveBeenCalled();
    });
  });

  describe('Filter Sheet Content', () => {
    beforeEach(() => {
      render(<MobileEquipmentFilters {...defaultProps} showMobileFilters={true} />);
    });

    it('renders all filter dropdowns in sheet', async () => {
      expect(screen.getByText('Filter Equipment')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Manufacturer')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('does NOT render a Team filter in the sheet (team scope is owned by the global TopBar)', () => {
      expect(screen.queryByText('Team')).not.toBeInTheDocument();
    });

    it('renders clear all filters button', () => {
      expect(screen.getByText('Clear All Filters')).toBeInTheDocument();
    });

    it('calls onClearFilters when clear button is clicked', () => {
      const clearButton = screen.getByText('Clear All Filters');
      fireEvent.click(clearButton);

      expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
    });

    it('calls onFilterChange when status filter changes', async () => {
      const statusSelect = screen.getByText('Status').closest('div')?.querySelector('[role="combobox"]');
      if (statusSelect) {
        fireEvent.click(statusSelect);

        const listbox = await screen.findByRole('listbox');
        const activeOption = within(listbox).getByRole('option', { name: 'Active' });
        fireEvent.click(activeOption);

        expect(mockOnFilterChange).toHaveBeenCalledWith('status', 'active');
      }
    });
  });

  describe('Active Filter Summary', () => {
    it('does not show active filter summary when activeFilterCount is 0', () => {
      render(<MobileEquipmentFilters {...defaultProps} activeFilterCount={0} />);

      expect(screen.queryByText(/Status:/)).not.toBeInTheDocument();
    });

    it('shows active filter badges when filters are active', () => {
      render(
        <MobileEquipmentFilters
          {...defaultProps}
          activeFilterCount={2}
          filters={{ ...defaultFilters, status: 'active', manufacturer: 'Toyota' }}
        />,
      );

      expect(screen.getByText(/Status: active/i)).toBeInTheDocument();
      expect(screen.getByText(/Manufacturer: Toyota/i)).toBeInTheDocument();
    });

    it('allows removing individual filters via badge X button', () => {
      render(
        <MobileEquipmentFilters
          {...defaultProps}
          activeFilterCount={1}
          filters={{ ...defaultFilters, status: 'active' }}
        />,
      );

      const statusBadge = screen.getByText(/Status: active/i).closest('[class*="badge"]');
      const xButton = statusBadge?.querySelector('svg');

      if (xButton) {
        fireEvent.click(xButton);
        expect(mockOnFilterChange).toHaveBeenCalledWith('status', 'all');
      }
    });

    it('does NOT render a "Team:" active filter badge (team scope is owned by the global TopBar)', () => {
      render(
        <MobileEquipmentFilters
          {...defaultProps}
          activeFilterCount={1}
          filters={{ ...defaultFilters, team: 'team-1' }}
        />,
      );

      expect(screen.queryByText(/^Team:/i)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty filter options', () => {
      render(
        <MobileEquipmentFilters
          {...defaultProps}
          filterOptions={{ manufacturers: [], locations: [] }}
        />,
      );

      expect(screen.getByPlaceholderText('Search equipment...')).toBeInTheDocument();
    });

    it('handles very long filter values', () => {
      render(
        <MobileEquipmentFilters
          {...defaultProps}
          filters={{ ...defaultFilters, search: 'a'.repeat(1000) }}
        />,
      );

      const searchInput = screen.getByPlaceholderText('Search equipment...') as HTMLInputElement;
      expect(searchInput.value.length).toBe(1000);
    });

    it('handles multiple active filters', () => {
      render(
        <MobileEquipmentFilters
          {...defaultProps}
          activeFilterCount={3}
          filters={{
            ...defaultFilters,
            status: 'active',
            manufacturer: 'Toyota',
            location: 'Warehouse A',
          }}
        />,
      );

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText(/Status: active/i)).toBeInTheDocument();
      expect(screen.getByText(/Manufacturer: Toyota/i)).toBeInTheDocument();
      expect(screen.getByText(/Location: Warehouse A/i)).toBeInTheDocument();
    });
  });
});
