import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, LayoutGrid, List, Rows3 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { SortConfig } from '@/features/equipment/hooks/useEquipmentFiltering';
import { useIsMobile } from '@/hooks/use-mobile';
import type { EquipmentViewMode } from './EquipmentCard';

interface EquipmentSortHeaderProps {
  sortConfig: SortConfig;
  onSortChange: (field: string, direction?: 'asc' | 'desc') => void;
  resultCount: number;
  totalCount: number;
  viewMode?: EquipmentViewMode;
  onViewModeChange?: (mode: EquipmentViewMode) => void;
}

const compositeSortOptions = [
  { value: 'name:asc', label: 'Name (A\u2013Z)' },
  { value: 'name:desc', label: 'Name (Z\u2013A)' },
  { value: 'working_hours:desc', label: 'Hours (High\u2013Low)' },
  { value: 'working_hours:asc', label: 'Hours (Low\u2013High)' },
  { value: 'last_maintenance:desc', label: 'Last Maintenance' },
  { value: 'updated_at:desc', label: 'Last Updated' },
  { value: 'status:asc', label: 'Status' },
  { value: 'location:asc', label: 'Location (A\u2013Z)' },
  { value: 'manufacturer:asc', label: 'Manufacturer (A\u2013Z)' },
  { value: 'created_at:desc', label: 'Recently Added' },
  { value: 'warranty_expiration:asc', label: 'Warranty Expiration' },
];

const EquipmentSortHeader: React.FC<EquipmentSortHeaderProps> = ({
  sortConfig,
  onSortChange,
  resultCount,
  totalCount,
  viewMode = 'grid',
  onViewModeChange,
}) => {
  const isMobile = useIsMobile();

  const compositeValue = `${sortConfig.field}:${sortConfig.direction}`;
  const currentLabel = compositeSortOptions.find(o => o.value === compositeValue)?.label
    ?? compositeSortOptions.find(o => o.value.startsWith(sortConfig.field + ':'))?.label
    ?? sortConfig.field;

  const handleCompositeChange = (value: string) => {
    const [field, direction] = value.split(':') as [string, 'asc' | 'desc'];
    onSortChange(field, direction);
  };

  return (
    <div className={`${isMobile ? 'flex items-center gap-2' : 'flex items-center justify-between'} mb-4 md:mb-6`}>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Sorted by {currentLabel}. Showing {resultCount} of {totalCount} equipment.
      </div>

      {isMobile ? (
        /* Mobile: pill-style grouped control — count badge + sort select side-by-side */
        <div className="flex items-center gap-2 w-full">
          <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground tabular-nums">
            {resultCount} / {totalCount}
          </span>
          <Select value={compositeValue} onValueChange={handleCompositeChange}>
            <SelectTrigger
              className="h-11 min-w-0 flex-1 gap-1"
              aria-label="Sort equipment"
            >
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {compositeSortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        /* Desktop: original layout */
        <>
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{resultCount}</span> of{' '}
            <span className="font-medium text-foreground">{totalCount}</span> equipment
          </div>
          <div className="flex items-center gap-2">
            <Select value={compositeValue} onValueChange={handleCompositeChange}>
              <SelectTrigger className="w-[200px]" aria-label="Sort equipment">
                <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {compositeSortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {onViewModeChange && (
              <div className="flex items-center rounded-md border" role="radiogroup" aria-label="View mode">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8 rounded-r-none', viewMode === 'grid' && 'bg-muted')}
                  onClick={() => onViewModeChange('grid')}
                  aria-label="Grid view"
                  aria-checked={viewMode === 'grid'}
                  role="radio"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8 rounded-none', viewMode === 'list' && 'bg-muted')}
                  onClick={() => onViewModeChange('list')}
                  aria-label="List view"
                  aria-checked={viewMode === 'list'}
                  role="radio"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8 rounded-l-none', viewMode === 'table' && 'bg-muted')}
                  onClick={() => onViewModeChange('table')}
                  aria-label="Table view"
                  aria-checked={viewMode === 'table'}
                  role="radio"
                >
                  <Rows3 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EquipmentSortHeader;
