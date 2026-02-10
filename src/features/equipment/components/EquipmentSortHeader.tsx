import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SortConfig } from '@/features/equipment/hooks/useEquipmentFiltering';
import { useIsMobile } from '@/hooks/use-mobile';

interface EquipmentSortHeaderProps {
  sortConfig: SortConfig;
  onSortChange: (field: string) => void;
  resultCount: number;
  totalCount: number;
}

const EquipmentSortHeader: React.FC<EquipmentSortHeaderProps> = ({
  sortConfig,
  onSortChange,
  resultCount,
  totalCount,
}) => {
  const isMobile = useIsMobile();
  
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'manufacturer', label: 'Manufacturer' },
    { value: 'model', label: 'Model' },
    { value: 'location', label: 'Location' },
    { value: 'status', label: 'Status' },
    { value: 'installation_date', label: 'Installation Date' },
    { value: 'last_maintenance', label: 'Last Maintenance' },
    { value: 'warranty_expiration', label: 'Warranty Expiration' },
    { value: 'created_at', label: 'Date Added' },
    { value: 'updated_at', label: 'Last Updated' }
  ];

  const getSortIcon = (field: string) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  // Get display label for current direction
  const getDirectionLabel = () => {
    return sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A';
  };

  const currentSortLabel = sortOptions.find(o => o.value === sortConfig.field)?.label ?? sortConfig.field;
  const currentDirectionLabel = sortConfig.direction === 'asc' ? 'ascending' : 'descending';

  return (
    <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between'} mb-4 md:mb-6`}>
      {/* Visually hidden live region for screen readers to announce sort changes */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Sorted by {currentSortLabel}, {currentDirectionLabel}. Showing {resultCount} of {totalCount} equipment.
      </div>
      <div className={`${isMobile ? 'flex items-center justify-between gap-2' : 'flex items-center gap-4'}`}>
        <div className={`${isMobile ? 'min-w-0 truncate' : ''} text-sm text-muted-foreground`}>
          Showing <span className="font-medium text-foreground">{resultCount}</span> of{' '}
          <span className="font-medium text-foreground">{totalCount}</span> equipment
        </div>

        {isMobile && (
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Combined sort control with clear labeling */}
            <Select value={sortConfig.field} onValueChange={onSortChange}>
              <SelectTrigger 
                className="h-9 w-auto min-w-[120px] gap-1"
                aria-label={`Sort by ${sortOptions.find(o => o.value === sortConfig.field)?.label}`}
              >
                <span className="text-muted-foreground text-xs mr-1">Sort:</span>
                <SelectValue />
                {getSortIcon(sortConfig.field)}
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onSortChange(sortConfig.field)}
              className="h-9 px-2 text-xs gap-1"
              aria-label={`Toggle sort direction, currently ${sortConfig.direction === 'asc' ? 'ascending' : 'descending'}`}
            >
              {getSortIcon(sortConfig.field)}
              <span className="hidden xs:inline">{getDirectionLabel()}</span>
            </Button>
          </div>
        )}
      </div>

      {!isMobile && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>

          <Select value={sortConfig.field} onValueChange={onSortChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex w-full items-center justify-between">
                    {option.label}
                    {sortConfig.field === option.value && (
                      <div className="ml-2">
                        {getSortIcon(option.value)}
                      </div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onSortChange(sortConfig.field)}
            className="px-3 gap-1"
            aria-label={`Toggle sort direction, currently ${sortConfig.direction === 'asc' ? 'ascending' : 'descending'}`}
          >
            {getSortIcon(sortConfig.field)}
            <span>{getDirectionLabel()}</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default EquipmentSortHeader;
