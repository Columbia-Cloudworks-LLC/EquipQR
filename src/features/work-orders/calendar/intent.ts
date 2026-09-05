import type { CalendarDay, DueWrite } from '@/features/work-orders/calendar/dueDate';
import type { CalendarRange, WorkOrdersChrome } from '@/features/work-orders/calendar/url';
import type { CalendarItem } from '@/features/work-orders/calendar/placement';

export type CreateDuePrefill = Extract<DueWrite, { op: 'setDay' } | { op: 'setTimed' }>;

export type CalendarIntent =
  | { readonly type: 'select'; readonly workOrderId: string }
  | { readonly type: 'create'; readonly prefill: CreateDuePrefill }
  | { readonly type: 'reschedule'; readonly workOrderId: string; readonly write: DueWrite };

export type WorkOrderCalendarProps = {
  items: readonly CalendarItem[];
  range: CalendarRange;
  anchor: CalendarDay;
  selectedWorkOrderId: string | null;
  onIntent: (intent: CalendarIntent) => void;
  onChromeChange: (chrome: Extract<WorkOrdersChrome, { surface: 'calendar' }>) => void;
};

export type { CalendarDay };
