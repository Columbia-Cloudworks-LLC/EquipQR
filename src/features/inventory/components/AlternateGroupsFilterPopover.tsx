import React, { useState } from 'react';
import { Filter, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type GroupStatusFilter = 'all' | 'verified' | 'unverified' | 'deprecated';

const STATUS_OPTIONS: { value: GroupStatusFilter; label: string; icon?: React.ReactNode }[] = [
  { value: 'all', label: 'All' },
  {
    value: 'verified',
    label: 'Verified',
    icon: <CheckCircle2 className="h-3 w-3 text-success" />,
  },
  {
    value: 'unverified',
    label: 'Unverified',
  },
  {
    value: 'deprecated',
    label: 'Deprecated',
    icon: <AlertTriangle className="h-3 w-3 text-warning" />,
  },
];

interface AlternateGroupsFilterPopoverProps {
  statusFilter: GroupStatusFilter;
  onStatusChange: (status: GroupStatusFilter) => void;
  activeFilterCount: number;
}

const AlternateGroupsFilterPopover: React.FC<AlternateGroupsFilterPopoverProps> = ({
  statusFilter,
  onStatusChange,
  activeFilterCount,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-sm font-normal"
          aria-label={`Filter groups${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
        >
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          Filter
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 min-w-4 rounded-full px-1 py-0 text-[10px] font-semibold leading-none"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-4" align="start">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Status
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onStatusChange(option.value);
                  if (option.value !== 'all') setOpen(false);
                }}
                className={cn(
                  'inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition-colors',
                  statusFilter === option.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>

          {activeFilterCount > 0 && (
            <>
              <Separator />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onStatusChange('all');
                  setOpen(false);
                }}
              >
                <X className="h-3 w-3 mr-1.5" />
                Clear filter
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AlternateGroupsFilterPopover;
