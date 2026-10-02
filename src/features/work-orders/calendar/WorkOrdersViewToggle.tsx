import { Calendar, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PersistedViewMode } from '@/features/work-orders/calendar/url';
import { cn } from '@/lib/utils';

export type WorkOrdersViewToggleProps = {
  surface: PersistedViewMode;
  onChange: (surface: PersistedViewMode) => void;
  className?: string;
  isMobile?: boolean;
};

export function WorkOrdersViewToggle({
  surface,
  onChange,
  className,
  isMobile = false,
}: WorkOrdersViewToggleProps) {
  return (
    <div
      className={cn('flex w-fit items-center rounded-md border', className)}
      role="radiogroup"
      aria-label="Work orders view"
    >
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-11 gap-2 rounded-r-none px-3 md:h-8', surface === 'list' && 'bg-muted')}
        onClick={() => onChange('list')}
        aria-label="List view"
        aria-checked={surface === 'list'}
        role="radio"
      >
        <List className="h-3.5 w-3.5" />
        <span>List</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-11 gap-2 rounded-l-none px-3 md:h-8', surface === 'calendar' && 'bg-muted')}
        onClick={() => onChange('calendar')}
        aria-label={isMobile ? 'Agenda view' : 'Calendar view'}
        aria-checked={surface === 'calendar'}
        role="radio"
      >
        <Calendar className="h-3.5 w-3.5" />
        <span>{isMobile ? 'Agenda' : 'Calendar'}</span>
      </Button>
    </div>
  );
}
