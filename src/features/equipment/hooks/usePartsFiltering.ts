import { useState, useMemo, useCallback } from 'react';
import type { PartialInventoryItem } from '@/features/inventory/types/inventory';
import {
  PartsFiltersState,
  DEFAULT_PARTS_FILTERS,
  PartsSortField,
  PartsSortOrder,
  StockFilter,
} from '@/features/equipment/components/parts-tab/types';

interface UsePartsFilteringOptions {
  parts: PartialInventoryItem[];
}

interface UsePartsFilteringReturn {
  filters: PartsFiltersState;
  filteredParts: PartialInventoryItem[];
  activeFilterCount: number;
  hasActiveFilters: boolean;
  setSearch: (search: string) => void;
  setStockFilter: (filter: StockFilter) => void;
  setHasAlternatesOnly: (value: boolean) => void;
  setSort: (field: PartsSortField, order: PartsSortOrder) => void;
  clearFilters: () => void;
}

export function usePartsFiltering({ parts }: UsePartsFilteringOptions): UsePartsFilteringReturn {
  const [filters, setFilters] = useState<PartsFiltersState>(DEFAULT_PARTS_FILTERS);

  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const setStockFilter = useCallback((stockFilter: StockFilter) => {
    setFilters(prev => ({ ...prev, stockFilter }));
  }, []);

  const setHasAlternatesOnly = useCallback((hasAlternatesOnly: boolean) => {
    setFilters(prev => ({ ...prev, hasAlternatesOnly }));
  }, []);

  const setSort = useCallback((sortField: PartsSortField, sortOrder: PartsSortOrder) => {
    setFilters(prev => ({ ...prev, sortField, sortOrder }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_PARTS_FILTERS);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.stockFilter !== 'all') count++;
    if (filters.hasAlternatesOnly) count++;
    return count;
  }, [filters.search, filters.stockFilter, filters.hasAlternatesOnly]);

  const hasActiveFilters = activeFilterCount > 0;

  const filteredParts = useMemo(() => {
    return parts
      .filter(part => {
        // Search filter (name or SKU)
        if (filters.search) {
          const query = filters.search.toLowerCase();
          const matchesName = part.name.toLowerCase().includes(query);
          const matchesSku = part.sku?.toLowerCase().includes(query);
          if (!matchesName && !matchesSku) return false;
        }

        // Stock status filter
        const isOutOfStock = part.quantity_on_hand <= 0;
        const isLowStock = part.quantity_on_hand < part.low_stock_threshold && part.quantity_on_hand > 0;

        switch (filters.stockFilter) {
          case 'out_of_stock':
            if (!isOutOfStock) return false;
            break;
          case 'low_stock':
            if (!isLowStock) return false;
            break;
          case 'in_stock':
            if (isOutOfStock) return false;
            break;
        }

        // Alternates filter
        if (filters.hasAlternatesOnly && !part.hasAlternates) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const { sortField, sortOrder } = filters;
        const multiplier = sortOrder === 'asc' ? 1 : -1;

        switch (sortField) {
          case 'name':
            return multiplier * a.name.localeCompare(b.name);
          case 'stock':
            return multiplier * (a.quantity_on_hand - b.quantity_on_hand);
          case 'location': {
            const locA = a.location || '';
            const locB = b.location || '';
            return multiplier * locA.localeCompare(locB);
          }
          default:
            return 0;
        }
      });
  }, [parts, filters]);

  return {
    filters,
    filteredParts,
    activeFilterCount,
    hasActiveFilters,
    setSearch,
    setStockFilter,
    setHasAlternatesOnly,
    setSort,
    clearFilters,
  };
}
