import React from 'react';
import { render, screen, fireEvent, within } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DesktopEquipmentFilters } from '../DesktopEquipmentFilters';
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
  warrantyExpiring: false
};

const defaultFilterOptions = {
  manufacturers: ['Toyota', 'Caterpillar', 'John Deere'],
  locations: ['Warehouse A', 'Warehouse B', 'Field Site 1'],
  teams: [
    { id: 'team-1', name: 'Maintenance Team' },
    { id: 'team-2', name: 'Operations Team' }
  ]
};

describe('DesktopEquipmentFilters', () => {
  const mockOnFilterChange = vi.fn();
  const mockOnClearFilters = vi.fn();

  const defaultProps = {
    filters: defaultFilters,
    onFilterChange: mockOnFilterChange,
    onClearFilters: mockOnClearFilters,
    filterOptions: defaultFilterOptions,
    hasActiveFilters: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core Rendering', () => {
    it('renders search input', () => {
      render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search equipment...');
      expect(searchInput).toBeInTheDocument();
    });

    it('renders status filter dropdown', () => {
      render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const statusSelect = screen.getByRole('combobox', { name: /filter by status/i });
      expect(statusSelect).toBeInTheDocument();
    });

    it('renders manufacturer filter dropdown', () => {
      render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const manufacturerSelect = screen.getByRole('combobox', { name: /manufacturer/i });
      expect(manufacturerSelect).toBeInTheDocument();
    });

    it('renders location filter dropdown', () => {
      render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const locationSelect = screen.getByRole('combobox', { name: /location/i });
      expect(locationSelect).toBeInTheDocument();
    });

    it('renders team filter dropdown', () => {
      render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const teamSelect = screen.getByRole('combobox', { name: /team/i });
      expect(teamSelect).toBeInTheDocument();
    });

    it('renders clear filters button', () => {
      render(<DesktopEquipmentFilters {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /no active filters/i })).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('displays current search value', () => {
      render(
        <DesktopEquipmentFilters 
          {...defaultProps} 
          filters={{ ...defaultFilters, search: 'test query' }} 
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Search equipment...') as HTMLInputElement;
      expect(searchInput.value).toBe('test query');
    });

    it('calls onFilterChange when search input changes', () => {
      render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search equipment...');
      fireEvent.change(searchInput, { target: { value: 'forklift' } });
      
      expect(mockOnFilterChange).toHaveBeenCalledWith('search', 'forklift');
    });
  });

  describe('Status Filter', () => {
    it('displays current status value', () => {
      render(
        <DesktopEquipmentFilters 
          {...defaultProps} 
          filters={{ ...defaultFilters, status: 'active' }} 
        />
      );
      
      const statusSelect = screen.getByRole('combobox', { name: /filter by status/i });
      expect(within(statusSelect).getByText('Active')).toBeInTheDocument();
    });

    it('calls onFilterChange when status changes', async () => {
      render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const statusSelect = screen.getByRole('combobox', { name: /filter by status/i });
      fireEvent.click(statusSelect);
      
      const listbox = await screen.findByRole('listbox');
      const activeOption = within(listbox).getByRole('option', { name: 'Active' });
      fireEvent.click(activeOption);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith('status', 'active');
    });

    it('shows all status options', async () => {
      render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const statusSelect = screen.getByRole('combobox', { name: /filter by status/i });
      fireEvent.click(statusSelect);
      
      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByRole('option', { name: 'All Status' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Active' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Maintenance' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Inactive' })).toBeInTheDocument();
    });
  });

  describe('Manufacturer Filter', () => {
    it('displays manufacturer options from filterOptions', async () => {
      render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const manufacturerSelect = screen.getByRole('combobox', { name: /manufacturer/i });
      fireEvent.click(manufacturerSelect);
      
      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByRole('option', { name: 'All Manufacturers' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Toyota' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Caterpillar' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'John Deere' })).toBeInTheDocument();
    });

    it('calls onFilterChange when manufacturer changes', async () => {
      render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const manufacturerSelect = screen.getByRole('combobox', { name: /manufacturer/i });
      fireEvent.click(manufacturerSelect);
      
      const listbox = await screen.findByRole('listbox');
      const toyotaOption = within(listbox).getByRole('option', { name: 'Toyota' });
      fireEvent.click(toyotaOption);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith('manufacturer', 'Toyota');
    });
  });

  describe('Location Filter', () => {
    it('displays location options from filterOptions', async () => {
      render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const locationSelect = screen.getByRole('combobox', { name: /location/i });
      fireEvent.click(locationSelect);
      
      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByRole('option', { name: 'All Locations' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Warehouse A' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Warehouse B' })).toBeInTheDocument();
    });

    it('calls onFilterChange when location changes', async () => {
      render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const locationSelect = screen.getByRole('combobox', { name: /location/i });
      fireEvent.click(locationSelect);
      
      const listbox = await screen.findByRole('listbox');
      const warehouseAOption = within(listbox).getByRole('option', { name: 'Warehouse A' });
      fireEvent.click(warehouseAOption);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith('location', 'Warehouse A');
    });
  });

  describe('Team Filter', () => {
    it('displays team options from filterOptions', async () => {
      render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const teamSelect = screen.getByRole('combobox', { name: /team/i });
      fireEvent.click(teamSelect);
      
      const listbox = await screen.findByRole('listbox');
      expect(within(listbox).getByRole('option', { name: 'All Teams' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Maintenance Team' })).toBeInTheDocument();
      expect(within(listbox).getByRole('option', { name: 'Operations Team' })).toBeInTheDocument();
    });

    it('calls onFilterChange when team changes', async () => {
      render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const teamSelect = screen.getByRole('combobox', { name: /team/i });
      fireEvent.click(teamSelect);
      
      const listbox = await screen.findByRole('listbox');
      const maintenanceTeamOption = within(listbox).getByRole('option', { name: 'Maintenance Team' });
      fireEvent.click(maintenanceTeamOption);
      
      expect(mockOnFilterChange).toHaveBeenCalledWith('team', 'team-1');
    });
  });

  describe('Clear Filters Button', () => {
    it('shows "No Active Filters" when hasActiveFilters is false', () => {
      render(<DesktopEquipmentFilters {...defaultProps} hasActiveFilters={false} />);
      
      const clearButton = screen.getByRole('button', { name: /no active filters/i });
      expect(clearButton).toBeInTheDocument();
      expect(clearButton).toBeDisabled();
    });

    it('shows "Clear Filters" when hasActiveFilters is true', () => {
      render(<DesktopEquipmentFilters {...defaultProps} hasActiveFilters={true} />);
      
      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      expect(clearButton).toBeInTheDocument();
      expect(clearButton).not.toBeDisabled();
    });

    it('calls onClearFilters when clear button is clicked', () => {
      render(<DesktopEquipmentFilters {...defaultProps} hasActiveFilters={true} />);
      
      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      fireEvent.click(clearButton);
      
      expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe('Layout and Styling', () => {
    it('applies responsive grid classes', () => {
      const { container } = render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const grid = container.querySelector('[class*="grid"]');
      expect(grid).toHaveClass('grid');
      expect(grid).toHaveClass('grid-cols-2');
      expect(grid).toHaveClass('sm:grid-cols-5');
    });

    it('renders in a Card component', () => {
      const { container } = render(<DesktopEquipmentFilters {...defaultProps} />);
      
      const card = container.querySelector('[class*="card"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty filter options', () => {
      render(
        <DesktopEquipmentFilters 
          {...defaultProps} 
          filterOptions={{ manufacturers: [], locations: [], teams: [] }} 
        />
      );
      
      // Should still render without errors
      expect(screen.getByPlaceholderText('Search equipment...')).toBeInTheDocument();
    });

    it('handles many filter options', () => {
      const manyOptions = {
        manufacturers: Array.from({ length: 50 }, (_, i) => `Manufacturer ${i}`),
        locations: Array.from({ length: 50 }, (_, i) => `Location ${i}`),
        teams: Array.from({ length: 50 }, (_, i) => ({ id: `team-${i}`, name: `Team ${i}` }))
      };
      
      render(
        <DesktopEquipmentFilters 
          {...defaultProps} 
          filterOptions={manyOptions} 
        />
      );
      
      expect(screen.getByPlaceholderText('Search equipment...')).toBeInTheDocument();
    });
  });
});


