/**
 * Types for Parts Tab filtering and sorting
 */

export type PartsSortField = 'name' | 'stock' | 'location';
export type PartsSortOrder = 'asc' | 'desc';
export type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export interface PartsFiltersState {
  search: string;
  stockFilter: StockFilter;
  hasAlternatesOnly: boolean;
  sortField: PartsSortField;
  sortOrder: PartsSortOrder;
}

export const DEFAULT_PARTS_FILTERS: PartsFiltersState = {
  search: '',
  stockFilter: 'all',
  hasAlternatesOnly: false,
  sortField: 'name',
  sortOrder: 'asc',
};

export const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A-Z)', field: 'name' as const, order: 'asc' as const },
  { value: 'name-desc', label: 'Name (Z-A)', field: 'name' as const, order: 'desc' as const },
  { value: 'stock-asc', label: 'Stock (Low to High)', field: 'stock' as const, order: 'asc' as const },
  { value: 'stock-desc', label: 'Stock (High to Low)', field: 'stock' as const, order: 'desc' as const },
  { value: 'location-asc', label: 'Location (A-Z)', field: 'location' as const, order: 'asc' as const },
] as const;

export const STOCK_FILTER_OPTIONS = [
  { value: 'all', label: 'All Stock Levels' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
] as const;
