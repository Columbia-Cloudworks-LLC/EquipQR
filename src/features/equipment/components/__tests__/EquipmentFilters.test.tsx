import React from 'react';
import { render, screen } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EquipmentFilters as EquipmentFiltersComponent } from '../EquipmentFilters';
import { EquipmentFilters } from '@/features/equipment/hooks/useEquipmentFiltering';

// Mock mobile hook
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false)
}));

// Mock mobile and desktop filter components
vi.mock('../MobileEquipmentFilters', () => ({
  MobileEquipmentFilters: ({ activeFilterCount, showMobileFilters }: { activeFilterCount: number; showMobileFilters: boolean }) => (
    <div data-testid="mobile-filters">
      <div>Mobile Filters</div>
      <div>Active Count: {activeFilterCount}</div>
      <div>Show: {showMobileFilters ? 'true' : 'false'}</div>
    </div>
  )
}));

vi.mock('../DesktopEquipmentFilters', () => ({
  DesktopEquipmentFilters: ({ hasActiveFilters }: { hasActiveFilters: boolean }) => (
    <div data-testid="desktop-filters">
      <div>Desktop Filters</div>
      <div>Has Active: {hasActiveFilters ? 'true' : 'false'}</div>
    </div>
  )
}));

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
  locations: ['Warehouse A'],
  teams: [{ id: 'team-1', name: 'Team 1' }]
};

describe('EquipmentFilters', () => {
  const mockOnFilterChange = vi.fn();
  const mockOnClearFilters = vi.fn();
  const mockOnQuickFilter = vi.fn();

  const defaultProps = {
    filters: defaultFilters,
    onFilterChange: mockOnFilterChange,
    onClearFilters: mockOnClearFilters,
    onQuickFilter: mockOnQuickFilter,
    filterOptions: defaultFilterOptions,
    hasActiveFilters: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Responsive Rendering', () => {
    it('renders desktop filters when not on mobile', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(false);

      render(<EquipmentFiltersComponent {...defaultProps} />);
      
      expect(screen.getByTestId('desktop-filters')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-filters')).not.toBeInTheDocument();
    });

    it('renders mobile filters when on mobile', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(<EquipmentFiltersComponent {...defaultProps} />);
      
      expect(screen.getByTestId('mobile-filters')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-filters')).not.toBeInTheDocument();
    });
  });

  describe('Active Filter Count Calculation', () => {
    it('calculates active filter count correctly', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <EquipmentFiltersComponent 
          {...defaultProps} 
          filters={{ ...defaultFilters, status: 'active', manufacturer: 'Toyota' }}
        />
      );
      
      expect(screen.getByText('Active Count: 2')).toBeInTheDocument();
    });

    it('counts status filter when not "all"', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <EquipmentFiltersComponent 
          {...defaultProps} 
          filters={{ ...defaultFilters, status: 'maintenance' }}
        />
      );
      
      expect(screen.getByText('Active Count: 1')).toBeInTheDocument();
    });

    it('counts manufacturer filter when not "all"', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <EquipmentFiltersComponent 
          {...defaultProps} 
          filters={{ ...defaultFilters, manufacturer: 'Toyota' }}
        />
      );
      
      expect(screen.getByText('Active Count: 1')).toBeInTheDocument();
    });

    it('counts location filter when not "all"', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <EquipmentFiltersComponent 
          {...defaultProps} 
          filters={{ ...defaultFilters, location: 'Warehouse A' }}
        />
      );
      
      expect(screen.getByText('Active Count: 1')).toBeInTheDocument();
    });

    it('counts team filter when not "all"', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <EquipmentFiltersComponent 
          {...defaultProps} 
          filters={{ ...defaultFilters, team: 'team-1' }}
        />
      );
      
      expect(screen.getByText('Active Count: 1')).toBeInTheDocument();
    });

    it('counts maintenance date filters', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <EquipmentFiltersComponent 
          {...defaultProps} 
          filters={{ 
            ...defaultFilters, 
            maintenanceDateFrom: '2024-01-01',
            maintenanceDateTo: '2024-12-31'
          }}
        />
      );
      
      expect(screen.getByText('Active Count: 1')).toBeInTheDocument();
    });

    it('counts installation date filters', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <EquipmentFiltersComponent 
          {...defaultProps} 
          filters={{ 
            ...defaultFilters, 
            installationDateFrom: '2024-01-01'
          }}
        />
      );
      
      expect(screen.getByText('Active Count: 1')).toBeInTheDocument();
    });

    it('counts warranty expiring filter', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <EquipmentFiltersComponent 
          {...defaultProps} 
          filters={{ ...defaultFilters, warrantyExpiring: true }}
        />
      );
      
      expect(screen.getByText('Active Count: 1')).toBeInTheDocument();
    });

    it('returns 0 when no filters are active', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(<EquipmentFiltersComponent {...defaultProps} />);
      
      expect(screen.getByText('Active Count: 0')).toBeInTheDocument();
    });
  });

  describe('Has Active Filters Calculation', () => {
    it('combines hasActiveFilters prop with calculated count', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(false);

      render(
        <EquipmentFiltersComponent 
          {...defaultProps} 
          hasActiveFilters={true}
          filters={{ ...defaultFilters, status: 'active' }}
        />
      );
      
      expect(screen.getByText('Has Active: true')).toBeInTheDocument();
    });

    it('uses calculated count when hasActiveFilters is false but filters are active', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(false);

      render(
        <EquipmentFiltersComponent 
          {...defaultProps} 
          hasActiveFilters={false}
          filters={{ ...defaultFilters, status: 'active' }}
        />
      );
      
      expect(screen.getByText('Has Active: true')).toBeInTheDocument();
    });
  });

  describe('Props Passing', () => {
    it('passes all props to desktop filters', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(false);

      render(<EquipmentFiltersComponent {...defaultProps} />);
      
      // Desktop filters should receive the props
      expect(screen.getByTestId('desktop-filters')).toBeInTheDocument();
    });

    it('passes all props to mobile filters', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(<EquipmentFiltersComponent {...defaultProps} />);
      
      // Mobile filters should receive the props
      expect(screen.getByTestId('mobile-filters')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles all filters active', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <EquipmentFiltersComponent 
          {...defaultProps} 
          filters={{ 
            ...defaultFilters, 
            status: 'active',
            manufacturer: 'Toyota',
            location: 'Warehouse A',
            team: 'team-1',
            maintenanceDateFrom: '2024-01-01',
            warrantyExpiring: true
          }}
        />
      );
      
      expect(screen.getByText('Active Count: 6')).toBeInTheDocument();
    });

    it('handles null and undefined filter values', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <EquipmentFiltersComponent 
          {...defaultProps} 
          filters={{ 
            ...defaultFilters,
            maintenanceDateFrom: null,
            maintenanceDateTo: undefined
          }}
        />
      );
      
      expect(screen.getByText('Active Count: 0')).toBeInTheDocument();
    });
  });
});


