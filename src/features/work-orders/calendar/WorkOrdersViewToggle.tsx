import { Calendar, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PersistedViewMode } from '@/features/work-orders/calendar/url';
import { cn } from '@/lib/utils';

export type WorkOrdersViewToggleProps = {
  surface: PersistedViewMode;
  onChange: (surface: PersistedViewMode) => void;
  className?: string;
};

export function WorkOrdersViewToggle({
  surface,
  onChange,
  className,
}: WorkOrdersViewToggleProps) {
  return (
    <div
      className={cn('hidden md:flex items-center rounded-md border', className)}
      role="radiogroup"
      aria-label="Work orders view"
    >
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 rounded-r-none', surface === 'list' && 'bg-muted')}
        onClick={() => onChange('list')}
        aria-label="List view"
        aria-checked={surface === 'list'}
        role="radio"
      >
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 rounded-l-none', surface === 'calendar' && 'bg-muted')}
        onClick={() => onChange('calendar')}
        aria-label="Calendar view"
        aria-checked={surface === 'calendar'}
        role="radio"
      >
        <Calendar className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
