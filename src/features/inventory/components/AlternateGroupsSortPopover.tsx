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

type GroupSortOption = 'name-asc' | 'name-desc' | 'updated-desc' | 'updated-asc';

const SORT_OPTIONS: { value: GroupSortOption; label: string }[] = [
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'updated-desc', label: 'Recently Modified' },
  { value: 'updated-asc', label: 'Oldest Modified' },
];

interface AlternateGroupsSortPopoverProps {
  sortBy: GroupSortOption;
  onSortChange: (sort: GroupSortOption) => void;
}

const AlternateGroupsSortPopover: React.FC<AlternateGroupsSortPopoverProps> = ({
  sortBy,
  onSortChange,
}) => {
  const [open, setOpen] = useState(false);

  const currentLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? sortBy;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-sm font-normal"
          aria-label="Sort alternate groups"
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[140px] truncate">{currentLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {SORT_OPTIONS.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onSortChange(option.value);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between gap-2"
                >
                  <span>{option.label}</span>
                  <Check
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      sortBy === option.value ? 'opacity-100' : 'opacity-0',
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

export default AlternateGroupsSortPopover;
