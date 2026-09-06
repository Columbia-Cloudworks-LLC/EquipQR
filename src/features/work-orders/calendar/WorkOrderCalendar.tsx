import { FullCalendarGrid } from '@/features/work-orders/calendar/adapter/FullCalendarGrid';
import type { WorkOrderCalendarProps } from '@/features/work-orders/calendar/intent';

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
