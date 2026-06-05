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

export type SortOption = { value: string; label: string };

export interface ListSortPopoverProps {
  sortOptions: SortOption[];
  compositeValue: string;
  currentLabel: string;
  onSelect: (value: string) => void;
  ariaLabel: string;
  labelMaxWidthClass?: string;
}

export const ListSortPopover: React.FC<ListSortPopoverProps> = ({
  sortOptions,
  compositeValue,
  currentLabel,
  onSelect,
  ariaLabel,
  labelMaxWidthClass = 'max-w-[140px]',
}) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string) => {
    onSelect(value);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-sm font-normal"
          aria-label={ariaLabel}
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={cn(labelMaxWidthClass, 'truncate')}>{currentLabel}</span>
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
