import React, { useState } from 'react';
import { Check, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { SortConfig } from '@/features/equipment/hooks/useEquipmentFiltering';

const sortOptions = [
  { value: 'name:asc', label: 'Name (A–Z)' },
  { value: 'name:desc', label: 'Name (Z–A)' },
  { value: 'working_hours:desc', label: 'Hours (High–Low)' },
  { value: 'working_hours:asc', label: 'Hours (Low–High)' },
  { value: 'last_maintenance:desc', label: 'Last Maintenance' },
  { value: 'updated_at:desc', label: 'Last Updated' },
  { value: 'status:asc', label: 'Status' },
  { value: 'location:asc', label: 'Location (A–Z)' },
  { value: 'manufacturer:asc', label: 'Manufacturer (A–Z)' },
  { value: 'created_at:desc', label: 'Recently Added' },
  { value: 'warranty_expiration:asc', label: 'Warranty Expiration' },
];

interface EquipmentSortPopoverProps {
  sortConfig: SortConfig;
  onSortChange: (field: string, direction?: 'asc' | 'desc') => void;
}

const EquipmentSortPopover: React.FC<EquipmentSortPopoverProps> = ({
  sortConfig,
  onSortChange,
}) => {
  const [open, setOpen] = useState(false);

  const compositeValue = `${sortConfig.field}:${sortConfig.direction}`;
  const currentLabel =
    sortOptions.find((o) => o.value === compositeValue)?.label ??
    sortOptions.find((o) => o.value.startsWith(sortConfig.field + ':'))?.label ??
    sortConfig.field;

  const handleSelect = (value: string) => {
    const [field, direction] = value.split(':') as [string, 'asc' | 'desc'];
    onSortChange(field, direction);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-sm font-normal"
          aria-label="Sort equipment"
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[140px] truncate">{currentLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {sortOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
                  className="flex items-center justify-between gap-2"
                >
                  <span>{option.label}</span>
                  <Check
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      compositeValue === option.value
                        ? 'opacity-100'
                        : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default EquipmentSortPopover;
