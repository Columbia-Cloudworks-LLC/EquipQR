import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EquipmentPartsTab from '../EquipmentPartsTab';
import * as useInventoryModule from '@/features/inventory/hooks/useInventory';
import type { PartialInventoryItem } from '@/features/inventory/types/inventory';

// Mock hooks
vi.mock('@/features/inventory/hooks/useInventory', () => ({
  useCompatibleInventoryItems: vi.fn()
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false)
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn())
  };
});

const createMockPart = (overrides: Partial<PartialInventoryItem> = {}): PartialInventoryItem => ({
  id: 'part-1',
  organization_id: 'org-1',
  name: 'Test Part',
  description: null,
  sku: 'SKU-001',
  external_id: null,
  quantity_on_hand: 10,
  low_stock_threshold: 5,
  image_url: null,
  location: 'Warehouse A',
  default_unit_cost: 100,
  isLowStock: false,
  hasAlternates: false,
  ...overrides
});

const mockParts: PartialInventoryItem[] = [
  createMockPart({ 
    id: 'part-1', 
    name: 'Alpha Filter', 
    sku: 'SKU-ALPHA', 
    quantity_on_hand: 15, 
    location: 'Shelf A' 
  }),
  createMockPart({ 
    id: 'part-2', 
    name: 'Beta Gasket', 
    sku: 'SKU-BETA', 
    quantity_on_hand: 3, 
    low_stock_threshold: 5,
    location: 'Shelf B',
    hasAlternates: true
  }),
  createMockPart({ 
    id: 'part-3', 
    name: 'Gamma Seal', 
    sku: 'SKU-GAMMA', 
    quantity_on_hand: 0, 
    location: 'Shelf C' 
  }),
  createMockPart({ 
    id: 'part-4', 
    name: 'Delta Bearing', 
    sku: 'SKU-DELTA', 
    quantity_on_hand: 25, 
    location: 'Shelf A',
    hasAlternates: true
  }),
];

describe('EquipmentPartsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useInventoryModule.useCompatibleInventoryItems).mockReturnValue({
      data: mockParts,
      isLoading: false,
      error: null,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useInventoryModule.useCompatibleInventoryItems>);
  });

  describe('Core Rendering', () => {
    it('renders the parts header', () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      expect(screen.getByText('Compatible Parts')).toBeInTheDocument();
      expect(screen.getByText('4 parts compatible with this equipment')).toBeInTheDocument();
    });

    it('renders the search input', () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      expect(screen.getByPlaceholderText('Search parts...')).toBeInTheDocument();
    });

    it('renders sort dropdown', () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      expect(screen.getByText('Name (A-Z)')).toBeInTheDocument();
    });

    it('renders all part cards', () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      expect(screen.getByText('Alpha Filter')).toBeInTheDocument();
      expect(screen.getByText('Beta Gasket')).toBeInTheDocument();
      expect(screen.getByText('Gamma Seal')).toBeInTheDocument();
      expect(screen.getByText('Delta Bearing')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading skeletons when isLoading is true', () => {
      vi.mocked(useInventoryModule.useCompatibleInventoryItems).mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        isError: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useInventoryModule.useCompatibleInventoryItems>);

      const { container } = render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no compatible parts exist', () => {
      vi.mocked(useInventoryModule.useCompatibleInventoryItems).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        isError: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useInventoryModule.useCompatibleInventoryItems>);

      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      expect(screen.getByText('No compatible parts')).toBeInTheDocument();
      expect(screen.getByText(/No inventory items have been linked/)).toBeInTheDocument();
    });

    it('shows filtered empty state when filters exclude all parts', async () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      // Search for something that doesn't exist
      const searchInput = screen.getByPlaceholderText('Search parts...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      await waitFor(() => {
        expect(screen.getByText('No parts match your filters')).toBeInTheDocument();
      });
      
      // Should show clear filters button
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });
  });

  describe('Search Filtering', () => {
    it('filters parts by name', async () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Search parts...');
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });
      
      await waitFor(() => {
        expect(screen.getByText('Alpha Filter')).toBeInTheDocument();
        expect(screen.queryByText('Beta Gasket')).not.toBeInTheDocument();
        expect(screen.queryByText('Gamma Seal')).not.toBeInTheDocument();
        expect(screen.queryByText('Delta Bearing')).not.toBeInTheDocument();
      });
    });

    it('filters parts by SKU', async () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Search parts...');
      fireEvent.change(searchInput, { target: { value: 'SKU-BETA' } });
      
      await waitFor(() => {
        expect(screen.getByText('Beta Gasket')).toBeInTheDocument();
        expect(screen.queryByText('Alpha Filter')).not.toBeInTheDocument();
      });
    });

    it('updates count when filtering', async () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Search parts...');
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });
      
      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 4 parts')).toBeInTheDocument();
      });
    });
  });

  describe('Stock Status Filtering', () => {
    it('filters to show only out of stock items', async () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      // Click stock filter dropdown
      const stockFilterTrigger = screen.getByText('All Stock Levels');
      fireEvent.click(stockFilterTrigger);
      
      // Select "Out of Stock" from the dropdown (use role to be more specific)
      const outOfStockOption = screen.getByRole('option', { name: 'Out of Stock' });
      fireEvent.click(outOfStockOption);
      
      await waitFor(() => {
        expect(screen.getByText('Gamma Seal')).toBeInTheDocument();
        expect(screen.queryByText('Alpha Filter')).not.toBeInTheDocument();
        expect(screen.queryByText('Beta Gasket')).not.toBeInTheDocument();
        expect(screen.queryByText('Delta Bearing')).not.toBeInTheDocument();
      });
    });

    it('filters to show only low stock items', async () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      const stockFilterTrigger = screen.getByText('All Stock Levels');
      fireEvent.click(stockFilterTrigger);
      
      // Select "Low Stock" from the dropdown (use role to be more specific)
      const lowStockOption = screen.getByRole('option', { name: 'Low Stock' });
      fireEvent.click(lowStockOption);
      
      await waitFor(() => {
        expect(screen.getByText('Beta Gasket')).toBeInTheDocument();
        expect(screen.queryByText('Alpha Filter')).not.toBeInTheDocument();
        expect(screen.queryByText('Gamma Seal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Alternates Filter', () => {
    it('filters to show only parts with alternates', async () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      // Find and click the alternates toggle
      const alternatesToggle = screen.getByRole('switch', { name: /alternates only/i });
      fireEvent.click(alternatesToggle);
      
      await waitFor(() => {
        expect(screen.getByText('Beta Gasket')).toBeInTheDocument();
        expect(screen.getByText('Delta Bearing')).toBeInTheDocument();
        expect(screen.queryByText('Alpha Filter')).not.toBeInTheDocument();
        expect(screen.queryByText('Gamma Seal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('sorts parts by name ascending by default', () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      const partNames = screen.getAllByRole('heading', { level: 4 });
      expect(partNames[0]).toHaveTextContent('Alpha Filter');
      expect(partNames[1]).toHaveTextContent('Beta Gasket');
      expect(partNames[2]).toHaveTextContent('Delta Bearing');
      expect(partNames[3]).toHaveTextContent('Gamma Seal');
    });

    it('sorts parts by name descending', async () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      // Click sort dropdown
      const sortTrigger = screen.getByText('Name (A-Z)');
      fireEvent.click(sortTrigger);
      
      // Select descending
      const descOption = screen.getByText('Name (Z-A)');
      fireEvent.click(descOption);
      
      await waitFor(() => {
        const partNames = screen.getAllByRole('heading', { level: 4 });
        expect(partNames[0]).toHaveTextContent('Gamma Seal');
        expect(partNames[3]).toHaveTextContent('Alpha Filter');
      });
    });

    it('sorts parts by stock low to high', async () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      const sortTrigger = screen.getByText('Name (A-Z)');
      fireEvent.click(sortTrigger);
      
      const stockLowOption = screen.getByText('Stock (Low to High)');
      fireEvent.click(stockLowOption);
      
      await waitFor(() => {
        const partNames = screen.getAllByRole('heading', { level: 4 });
        // 0 -> 3 -> 15 -> 25
        expect(partNames[0]).toHaveTextContent('Gamma Seal'); // 0
        expect(partNames[1]).toHaveTextContent('Beta Gasket'); // 3
        expect(partNames[2]).toHaveTextContent('Alpha Filter'); // 15
        expect(partNames[3]).toHaveTextContent('Delta Bearing'); // 25
      });
    });
  });

  describe('Clear Filters', () => {
    it('clears all filters when clear button is clicked', async () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      // Apply search filter
      const searchInput = screen.getByPlaceholderText('Search parts...');
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });
      
      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 4 parts')).toBeInTheDocument();
      });
      
      // Click clear button
      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(screen.getByText('4 parts compatible with this equipment')).toBeInTheDocument();
        expect(screen.getByText('Alpha Filter')).toBeInTheDocument();
        expect(screen.getByText('Beta Gasket')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('renders mobile toolbar on mobile', async () => {
      const { useIsMobile } = await import('@/hooks/use-mobile');
      vi.mocked(useIsMobile).mockReturnValue(true);

      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      // Mobile has a filter button instead of inline filters
      expect(screen.getByRole('button', { name: /open filters/i })).toBeInTheDocument();
    });
  });

  describe('Part Card Display', () => {
    it('shows out of stock badge for out of stock parts', () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });

    it('shows low stock badge for low stock parts', () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
    });

    it('shows alternates badge for parts with alternates', () => {
      render(
        <EquipmentPartsTab 
          equipmentId="eq-1" 
          organizationId="org-1" 
        />
      );
      
      // There should be multiple "Alternates" badges since Beta and Delta have alternates
      const alternatesBadges = screen.getAllByText('Alternates');
      expect(alternatesBadges.length).toBeGreaterThanOrEqual(2);
    });
  });
});
