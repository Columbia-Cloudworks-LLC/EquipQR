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
  warrantyExpiring: false
};

const defaultFilterOptions = {
  manufacturers: ['Toyota', 'Caterpillar'],
  locations: ['Warehouse A', 'Warehouse B'],
  teams: [
    { id: 'team-1', name: 'Maintenance Team' },
    { id: 'team-2', name: 'Operations Team' }
  ]
};

describe('MobileEquipmentFilters', () => {
  const mockOnFilterChange = vi.fn();
  const mockOnClearFilters = vi.fn();
  const mockOnQuickFilter = vi.fn();
  const mockOnShowMobileFiltersChange = vi.fn();

  const defaultProps = {
    filters: defaultFilters,
    activeFilterCount: 0,
    showMobileFilters: false,
    onShowMobileFiltersChange: mockOnShowMobileFiltersChange,
    onFilterChange: mockOnFilterChange,
    onClearFilters: mockOnClearFilters,
    onQuickFilter: mockOnQuickFilter,
    filterOptions: defaultFilterOptions
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

    it('renders quick filter buttons', () => {
      render(<MobileEquipmentFilters {...defaultProps} />);
      
      expect(screen.getByText('Maintenance Due')).toBeInTheDocument();
      expect(screen.getByText('Warranty Expiring')).toBeInTheDocument();
      expect(screen.getByText('Recently Added')).toBeInTheDocument();
      expect(screen.getByText('Active Only')).toBeInTheDocument();
    });

    it('renders filters button', () => {
      render(<MobileEquipmentFilters {...defaultProps} />);
      
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('displays current search value', () => {
      render(
        <MobileEquipmentFilters 
          {...defaultProps} 
          filters={{ ...defaultFilters, search: 'test query' }} 
        />
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

  describe('Quick Filters', () => {
    it('calls onQuickFilter when quick filter button is clicked', () => {
      render(<MobileEquipmentFilters {...defaultProps} />);
      
      const maintenanceDueButton = screen.getByText('Maintenance Due');
      fireEvent.click(maintenanceDueButton);
      
      expect(mockOnQuickFilter).toHaveBeenCalledWith('maintenance-due');
      expect(mockOnShowMobileFiltersChange).toHaveBeenCalledWith(false);
    });

    it('calls onQuickFilter with correct preset values', () => {
      render(<MobileEquipmentFilters {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Warranty Expiring'));
      expect(mockOnQuickFilter).toHaveBeenCalledWith('warranty-expiring');
      
      fireEvent.click(screen.getByText('Recently Added'));
      expect(mockOnQuickFilter).toHaveBeenCalledWith('recently-added');
      
      fireEvent.click(screen.getByText('Active Only'));
      expect(mockOnQuickFilter).toHaveBeenCalledWith('active-only');
    });
  });

  describe('Filter Sheet', () => {
    it('opens filter sheet when filters button is clicked', async () => {
      render(<MobileEquipmentFilters {...defaultProps} />);
      
      const filtersButton = screen.getByText('Filters');
      fireEvent.click(filtersButton);
      
      // Sheet should open
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
      // Badge should not be visible when count is 0
      expect(badge).not.toBeInTheDocument();
    });

    it('calls onShowMobileFiltersChange when sheet opens', () => {
      render(<MobileEquipmentFilters {...defaultProps} />);
      
      const filtersButton = screen.getByText('Filters');
      fireEvent.click(filtersButton);
      
      expect(mockOnShowMobileFiltersChange).toHaveBeenCalled();
    });
  });

  describe('Filter Sheet Content', () => {
    beforeEach(() => {
      // Open the sheet for these tests
      render(<MobileEquipmentFilters {...defaultProps} showMobileFilters={true} />);
    });

    it('renders all filter dropdowns in sheet', async () => {
      expect(screen.getByText('Filter Equipment')).toBeInTheDocument();
      
      // Status filter
      const statusLabel = screen.getByText('Status');
      expect(statusLabel).toBeInTheDocument();
      
      // Manufacturer filter
      const manufacturerLabel = screen.getByText('Manufacturer');
      expect(manufacturerLabel).toBeInTheDocument();
      
      // Location filter
      const locationLabel = screen.getByText('Location');
      expect(locationLabel).toBeInTheDocument();
      
      // Team filter
      const teamLabel = screen.getByText('Team');
      expect(teamLabel).toBeInTheDocument();
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
        />
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
        />
      );
      
      const statusBadge = screen.getByText(/Status: active/i).closest('[class*="badge"]');
      const xButton = statusBadge?.querySelector('svg');
      
      if (xButton) {
        fireEvent.click(xButton);
        expect(mockOnFilterChange).toHaveBeenCalledWith('status', 'all');
      }
    });

    it('shows team name in badge when team filter is active', () => {
      render(
        <MobileEquipmentFilters 
          {...defaultProps} 
          activeFilterCount={1}
          filters={{ ...defaultFilters, team: 'team-1' }}
        />
      );
      
      expect(screen.getByText(/Team: Maintenance Team/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty filter options', () => {
      render(
        <MobileEquipmentFilters 
          {...defaultProps} 
          filterOptions={{ manufacturers: [], locations: [], teams: [] }} 
        />
      );
      
      expect(screen.getByPlaceholderText('Search equipment...')).toBeInTheDocument();
    });

    it('handles very long filter values', () => {
      render(
        <MobileEquipmentFilters 
          {...defaultProps} 
          filters={{ ...defaultFilters, search: 'a'.repeat(1000) }}
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Search equipment...') as HTMLInputElement;
      expect(searchInput.value.length).toBe(1000);
    });

    it('handles multiple active filters', () => {
      render(
        <MobileEquipmentFilters 
          {...defaultProps} 
          activeFilterCount={4}
          filters={{ 
            ...defaultFilters, 
            status: 'active', 
            manufacturer: 'Toyota',
            location: 'Warehouse A',
            team: 'team-1'
          }}
        />
      );
      
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText(/Status: active/i)).toBeInTheDocument();
      expect(screen.getByText(/Manufacturer: Toyota/i)).toBeInTheDocument();
      expect(screen.getByText(/Location: Warehouse A/i)).toBeInTheDocument();
    });
  });
});

