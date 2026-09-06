import { Button } from '@/components/ui/button';
import type { CalendarRange } from '@/features/work-orders/calendar/url';
import { cn } from '@/lib/utils';

const RANGE_OPTIONS: { value: CalendarRange; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
];

export type CalendarRangeToggleProps = {
  range: CalendarRange;
  onChange: (range: CalendarRange) => void;
  className?: string;
};

export function CalendarRangeToggle({
  range,
  onChange,
  className,
}: CalendarRangeToggleProps) {
  return (
    <div
      className={cn('flex w-fit items-center rounded-md border', className)}
      role="radiogroup"
      aria-label="Calendar range"
    >
      {RANGE_OPTIONS.map((option, index) => (
        <Button
          key={option.value}
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 rounded-none px-3',
            index === 0 && 'rounded-l-md',
            index === RANGE_OPTIONS.length - 1 && 'rounded-r-md',
            range === option.value && 'bg-muted',
          )}
          onClick={() => onChange(option.value)}
          aria-label={option.label}
          aria-checked={range === option.value}
          role="radio"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
