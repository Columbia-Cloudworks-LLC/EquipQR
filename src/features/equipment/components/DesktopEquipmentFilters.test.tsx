import React from 'react';
import { render, screen, fireEvent, within } from '@vitest-harness/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DesktopEquipmentFilters } from './DesktopEquipmentFilters';
import { EquipmentFilters } from '@/features/equipment/hooks/useEquipmentFiltering';

/**
 * Wiring smoke tests only. Filter/sort/quick-filter behavior is covered by
 * `useEquipmentFiltering.test.tsx` — avoid re-opening every Radix Select here.
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
  manufacturers: ['Toyota', 'Caterpillar', 'John Deere'],
  locations: ['Warehouse A', 'Warehouse B', 'Field Site 1'],
  teams: [
    { id: 'team-1', name: 'Maintenance Team' },
    { id: 'team-2', name: 'Operations Team' },
  ],
};

describe('DesktopEquipmentFilters', () => {
  const mockOnFilterChange = vi.fn();
  const mockOnClearFilters = vi.fn();
  const mockOnQuickFilter = vi.fn();

  const defaultProps = {
    filters: defaultFilters,
    onFilterChange: mockOnFilterChange,
    onClearFilters: mockOnClearFilters,
    onQuickFilter: mockOnQuickFilter,
    filterOptions: defaultFilterOptions,
    hasActiveFilters: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search, filter comboboxes, and quick-filter chips', () => {
    render(<DesktopEquipmentFilters {...defaultProps} />);

    expect(screen.getByPlaceholderText('Search equipment...')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /filter by status/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /manufacturer/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /location/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /team/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /maintenance due/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /active only/i })).toBeInTheDocument();
  });

  it('wires search and one Select change to onFilterChange', async () => {
    render(<DesktopEquipmentFilters {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Search equipment...'), {
      target: { value: 'forklift' },
    });
    expect(mockOnFilterChange).toHaveBeenCalledWith('search', 'forklift');

    fireEvent.click(screen.getByRole('combobox', { name: /filter by status/i }));
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByRole('option', { name: 'Active' }));
    expect(mockOnFilterChange).toHaveBeenCalledWith('status', 'active');
  });

  it('shows clear button only when hasActiveFilters and wires onClearFilters', () => {
    const { rerender } = render(
      <DesktopEquipmentFilters {...defaultProps} hasActiveFilters={false} />,
    );
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();

    rerender(<DesktopEquipmentFilters {...defaultProps} hasActiveFilters={true} />);
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
  });

  it('wires quick filter chips to onQuickFilter', () => {
    render(<DesktopEquipmentFilters {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /maintenance due/i }));
    expect(mockOnQuickFilter).toHaveBeenCalled();
  });

  it('renders with empty filter options without crashing', () => {
    render(
      <DesktopEquipmentFilters
        {...defaultProps}
        filterOptions={{ manufacturers: [], locations: [], teams: [] }}
      />,
    );
    expect(screen.getByPlaceholderText('Search equipment...')).toBeInTheDocument();
  });
});
