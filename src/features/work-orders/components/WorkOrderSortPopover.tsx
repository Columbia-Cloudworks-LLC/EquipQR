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
import type { SortField, SortDirection } from '@/features/work-orders/hooks/useWorkOrderFilters';

const sortOptions: { value: string; label: string }[] = [
  { value: 'created:desc', label: 'Created (newest)' },
  { value: 'created:asc', label: 'Created (oldest)' },
  { value: 'due_date:asc', label: 'Due Date (soonest)' },
  { value: 'due_date:desc', label: 'Due Date (latest)' },
  { value: 'priority:desc', label: 'Priority (high first)' },
  { value: 'priority:asc', label: 'Priority (low first)' },
  { value: 'status:asc', label: 'Status (earliest)' },
  { value: 'status:desc', label: 'Status (latest)' },
];

interface WorkOrderSortPopoverProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
}

const WorkOrderSortPopover: React.FC<WorkOrderSortPopoverProps> = ({
  sortField,
  sortDirection,
  onSortChange,
}) => {
  const [open, setOpen] = useState(false);

  const compositeValue = `${sortField}:${sortDirection}`;
  const currentLabel =
    sortOptions.find((o) => o.value === compositeValue)?.label ?? compositeValue;

  const handleSelect = (value: string) => {
    const [field, direction] = value.split(':') as [SortField, SortDirection];
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
          aria-label="Sort work orders"
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[150px] truncate">{currentLabel}</span>
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
                      compositeValue === option.value ? 'opacity-100' : 'opacity-0',
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

export default WorkOrderSortPopover;
