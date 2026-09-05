import { Button } from '@/components/ui/button';
import { FullCalendarGrid } from '@/features/work-orders/calendar/adapter/FullCalendarGrid';
import type { WorkOrderCalendarProps } from '@/features/work-orders/calendar/intent';
import type { CalendarRange } from '@/features/work-orders/calendar/url';
import { cn } from '@/lib/utils';

const RANGE_OPTIONS: { value: CalendarRange; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
];

export function WorkOrderCalendar({
  items,
  range,
  anchor,
  selectedWorkOrderId,
  onIntent,
  onChromeChange,
}: WorkOrderCalendarProps) {
  return (
    <div className="space-y-2" data-testid="work-order-calendar">
      <div className="flex justify-center">
        <div
          className="flex w-fit items-center rounded-md border"
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
              onClick={() => onChromeChange({
                surface: 'calendar',
                range: option.value,
                anchor,
                selectedWorkOrderId,
              })}
              aria-label={option.label}
              aria-checked={range === option.value}
              role="radio"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      <FullCalendarGrid
        items={items}
        range={range}
        anchor={anchor}
        selectedWorkOrderId={selectedWorkOrderId}
        onIntent={onIntent}
        onVisibleAnchorChange={(nextAnchor) => onChromeChange({
          surface: 'calendar',
          range,
          anchor: nextAnchor,
          selectedWorkOrderId,
        })}
        onMoreLinkDay={(day) => onChromeChange({
          surface: 'calendar',
          range: 'day',
          anchor: day,
          selectedWorkOrderId,
        })}
      />
    </div>
  );
}
