import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, X, RefreshCw } from 'lucide-react';
import {
  PartsFiltersState,
  PartsSortField,
  PartsSortOrder,
  StockFilter,
  SORT_OPTIONS,
  STOCK_FILTER_OPTIONS,
} from './types';

interface DesktopPartsToolbarProps {
  filters: PartsFiltersState;
  hasActiveFilters: boolean;
  onSearchChange: (search: string) => void;
  onStockFilterChange: (filter: StockFilter) => void;
  onHasAlternatesChange: (value: boolean) => void;
  onSortChange: (field: PartsSortField, order: PartsSortOrder) => void;
  onClearFilters: () => void;
}

export const DesktopPartsToolbar: React.FC<DesktopPartsToolbarProps> = ({
  filters,
  hasActiveFilters,
  onSearchChange,
  onStockFilterChange,
  onHasAlternatesChange,
  onSortChange,
  onClearFilters,
}) => {
  const currentSortValue = `${filters.sortField}-${filters.sortOrder}`;

  const handleSortChange = (value: string) => {
    const option = SORT_OPTIONS.find(opt => opt.value === value);
    if (option) {
      onSortChange(option.field, option.order);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search parts..."
          value={filters.search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Sort Dropdown */}
      <Select value={currentSortValue} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Stock Filter Dropdown */}
      <Select
        value={filters.stockFilter}
        onValueChange={(value) => onStockFilterChange(value as StockFilter)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Stock status" />
        </SelectTrigger>
        <SelectContent>
          {STOCK_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Alternates Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="alternates-toggle"
          checked={filters.hasAlternatesOnly}
          onCheckedChange={onHasAlternatesChange}
        />
        <Label
          htmlFor="alternates-toggle"
          className="text-sm cursor-pointer flex items-center gap-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Alternates only
        </Label>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
};
