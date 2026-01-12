import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePartsFiltering } from '../usePartsFiltering';
import type { PartialInventoryItem } from '@/features/inventory/types/inventory';

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

describe('usePartsFiltering', () => {
  describe('Initial State', () => {
    it('returns all parts initially', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      expect(result.current.filteredParts).toHaveLength(4);
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.activeFilterCount).toBe(0);
    });

    it('returns default filter values', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      expect(result.current.filters).toEqual({
        search: '',
        stockFilter: 'all',
        hasAlternatesOnly: false,
        sortField: 'name',
        sortOrder: 'asc',
      });
    });

    it('sorts by name ascending by default', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      const names = result.current.filteredParts.map(p => p.name);
      expect(names).toEqual(['Alpha Filter', 'Beta Gasket', 'Delta Bearing', 'Gamma Seal']);
    });
  });

  describe('Search Filtering', () => {
    it('filters by name', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setSearch('Alpha');
      });
      
      expect(result.current.filteredParts).toHaveLength(1);
      expect(result.current.filteredParts[0].name).toBe('Alpha Filter');
    });

    it('filters by SKU', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setSearch('SKU-BETA');
      });
      
      expect(result.current.filteredParts).toHaveLength(1);
      expect(result.current.filteredParts[0].name).toBe('Beta Gasket');
    });

    it('is case insensitive', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setSearch('alpha');
      });
      
      expect(result.current.filteredParts).toHaveLength(1);
      expect(result.current.filteredParts[0].name).toBe('Alpha Filter');
    });

    it('updates activeFilterCount when search is applied', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setSearch('Alpha');
      });
      
      expect(result.current.activeFilterCount).toBe(1);
      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  describe('Stock Status Filtering', () => {
    it('filters for out of stock items', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setStockFilter('out_of_stock');
      });
      
      expect(result.current.filteredParts).toHaveLength(1);
      expect(result.current.filteredParts[0].name).toBe('Gamma Seal');
    });

    it('filters for low stock items', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setStockFilter('low_stock');
      });
      
      expect(result.current.filteredParts).toHaveLength(1);
      expect(result.current.filteredParts[0].name).toBe('Beta Gasket');
    });

    it('filters for in stock items', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setStockFilter('in_stock');
      });
      
      // Excludes only Gamma Seal (out of stock)
      expect(result.current.filteredParts).toHaveLength(3);
      const names = result.current.filteredParts.map(p => p.name);
      expect(names).not.toContain('Gamma Seal');
    });
  });

  describe('Alternates Filtering', () => {
    it('filters for parts with alternates', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setHasAlternatesOnly(true);
      });
      
      expect(result.current.filteredParts).toHaveLength(2);
      const names = result.current.filteredParts.map(p => p.name);
      expect(names).toContain('Beta Gasket');
      expect(names).toContain('Delta Bearing');
    });
  });

  describe('Sorting', () => {
    it('sorts by name descending', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setSort('name', 'desc');
      });
      
      const names = result.current.filteredParts.map(p => p.name);
      expect(names).toEqual(['Gamma Seal', 'Delta Bearing', 'Beta Gasket', 'Alpha Filter']);
    });

    it('sorts by stock ascending (low to high)', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setSort('stock', 'asc');
      });
      
      const stocks = result.current.filteredParts.map(p => p.quantity_on_hand);
      expect(stocks).toEqual([0, 3, 15, 25]);
    });

    it('sorts by stock descending (high to low)', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setSort('stock', 'desc');
      });
      
      const stocks = result.current.filteredParts.map(p => p.quantity_on_hand);
      expect(stocks).toEqual([25, 15, 3, 0]);
    });

    it('sorts by location ascending', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setSort('location', 'asc');
      });
      
      const locations = result.current.filteredParts.map(p => p.location);
      // Shelf A comes before Shelf B and Shelf C
      expect(locations[0]).toBe('Shelf A');
    });
  });

  describe('Combined Filters', () => {
    it('combines search and stock filter', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setSearch('a'); // matches Alpha, Beta, Gamma, Delta
        result.current.setStockFilter('in_stock');
      });
      
      // All parts contain 'a', but Gamma is out of stock
      expect(result.current.filteredParts).toHaveLength(3);
      const names = result.current.filteredParts.map(p => p.name);
      expect(names).not.toContain('Gamma Seal');
    });

    it('combines alternates filter with stock filter', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setHasAlternatesOnly(true);
        result.current.setStockFilter('in_stock');
      });
      
      // Beta (low stock but in stock) and Delta (in stock) have alternates
      expect(result.current.filteredParts).toHaveLength(2);
    });
  });

  describe('Clear Filters', () => {
    it('resets all filters to defaults', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      // Apply multiple filters
      act(() => {
        result.current.setSearch('test');
        result.current.setStockFilter('low_stock');
        result.current.setHasAlternatesOnly(true);
        result.current.setSort('stock', 'desc');
      });
      
      expect(result.current.hasActiveFilters).toBe(true);
      
      // Clear all
      act(() => {
        result.current.clearFilters();
      });
      
      expect(result.current.filters).toEqual({
        search: '',
        stockFilter: 'all',
        hasAlternatesOnly: false,
        sortField: 'name',
        sortOrder: 'asc',
      });
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.filteredParts).toHaveLength(4);
    });
  });

  describe('Active Filter Count', () => {
    it('counts search as one filter', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setSearch('test');
      });
      
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('counts stock filter as one filter', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setStockFilter('low_stock');
      });
      
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('counts alternates filter as one filter', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setHasAlternatesOnly(true);
      });
      
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('counts all filters combined', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setSearch('test');
        result.current.setStockFilter('low_stock');
        result.current.setHasAlternatesOnly(true);
      });
      
      expect(result.current.activeFilterCount).toBe(3);
    });

    it('does not count sort as a filter', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: mockParts }));
      
      act(() => {
        result.current.setSort('stock', 'desc');
      });
      
      expect(result.current.activeFilterCount).toBe(0);
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('Empty Parts Array', () => {
    it('handles empty parts array', () => {
      const { result } = renderHook(() => usePartsFiltering({ parts: [] }));
      
      expect(result.current.filteredParts).toHaveLength(0);
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });
});
