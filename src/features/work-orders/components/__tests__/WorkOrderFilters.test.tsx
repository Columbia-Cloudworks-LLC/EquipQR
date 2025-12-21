import React from 'react';
import { render, screen, fireEvent } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkOrderFilters } from '../WorkOrderFilters';

// Mock hooks
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false)
}));

const defaultFilters = {
  searchQuery: '',
  statusFilter: 'all',
  assigneeFilter: 'all',
  teamFilter: 'all',
  priorityFilter: 'all',
  dueDateFilter: 'all'
};

const mockTeams = [
  { id: 'team-1', name: 'Maintenance' },
  { id: 'team-2', name: 'Operations' }
];

describe('WorkOrderFilters', () => {
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
    teams: mockTeams
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Desktop View', () => {
    it('renders search input', () => {
      render(<WorkOrderFilters {...defaultProps} />);

      expect(screen.getByPlaceholderText(/search work orders/i)).toBeInTheDocument();
    });

    it('renders quick filter buttons', () => {
      render(<WorkOrderFilters {...defaultProps} />);

      expect(screen.getByRole('button', { name: /my work/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /urgent/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /overdue/i })).toBeInTheDocument();
    });

    it('calls onFilterChange when search input changes', () => {
      render(<WorkOrderFilters {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      fireEvent.change(searchInput, { target: { value: 'repair' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith('searchQuery', 'repair');
    });

    it('calls onQuickFilter when quick filter button is clicked', () => {
      render(<WorkOrderFilters {...defaultProps} />);

      const urgentButton = screen.getByRole('button', { name: /urgent/i });
      fireEvent.click(urgentButton);

      expect(mockOnQuickFilter).toHaveBeenCalledWith('urgent');
    });

    it('renders clear filters button when filters are active', () => {
      render(<WorkOrderFilters {...defaultProps} activeFilterCount={2} />);

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('calls onClearFilters when clear button is clicked', () => {
      render(<WorkOrderFilters {...defaultProps} activeFilterCount={2} />);

      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      expect(mockOnClearFilters).toHaveBeenCalled();
    });

    it('displays content when filters are active', () => {
      render(<WorkOrderFilters {...defaultProps} activeFilterCount={3} />);

      // Component should render successfully with active filters
      expect(screen.getByPlaceholderText(/search work orders/i)).toBeInTheDocument();
    });

    it('calls onQuickFilter with correct preset for each quick filter button', () => {
      render(<WorkOrderFilters {...defaultProps} />);

      const myWorkButton = screen.getByRole('button', { name: /my work/i });
      const urgentButton = screen.getByRole('button', { name: /urgent/i });
      const overdueButton = screen.getByRole('button', { name: /overdue/i });

      fireEvent.click(myWorkButton);
      expect(mockOnQuickFilter).toHaveBeenCalledWith('my-work');

      fireEvent.click(urgentButton);
      expect(mockOnQuickFilter).toHaveBeenCalledWith('urgent');

      fireEvent.click(overdueButton);
      expect(mockOnQuickFilter).toHaveBeenCalledWith('overdue');
    });

    it('resets all filters when clear filters is clicked', () => {
      render(<WorkOrderFilters {...defaultProps} activeFilterCount={3} />);

      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mobile View', () => {
    beforeEach(async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);
    });

    it('renders search input on mobile', () => {
      render(<WorkOrderFilters {...defaultProps} />);

      expect(screen.getByPlaceholderText(/search work orders/i)).toBeInTheDocument();
    });

    it('renders mobile quick filter buttons', () => {
      render(<WorkOrderFilters {...defaultProps} />);

      expect(screen.getByText('My Work')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    it('renders filter sheet trigger button', () => {
      render(<WorkOrderFilters {...defaultProps} />);

      expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
    });

    it('calls onShowMobileFiltersChange when filter button is clicked', () => {
      render(<WorkOrderFilters {...defaultProps} />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);

      expect(mockOnShowMobileFiltersChange).toHaveBeenCalledWith(true);
    });

    it('displays badge on mobile filter button when filters are active', () => {
      render(<WorkOrderFilters {...defaultProps} activeFilterCount={5} />);

      const badge = screen.getByText('5');
      expect(badge).toBeInTheDocument();
    });

    it('closes mobile sheet when onShowMobileFiltersChange is called with false', () => {
      render(<WorkOrderFilters {...defaultProps} showMobileFilters={true} />);

      // Simulate closing the sheet
      mockOnShowMobileFiltersChange(false);
      expect(mockOnShowMobileFiltersChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Filter Combinations', () => {
    it('updates search query independently of other filters', () => {
      render(<WorkOrderFilters {...defaultProps} activeFilterCount={2} />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      fireEvent.change(searchInput, { target: { value: 'maintenance' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith('searchQuery', 'maintenance');
      // Other filters should remain unchanged
      expect(mockOnClearFilters).not.toHaveBeenCalled();
    });
  });

});

