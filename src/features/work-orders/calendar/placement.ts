import {
  applyDueWrite,
  isDueOverdue,
  parseDue,
  placeWorkOrder,
  todayLocal,
  type CalendarDay,
  type CalendarPlacement,
  type DueColumns,
  type DueDate,
  type DueWrite,
} from '@/features/work-orders/calendar/dueDate';
import type { CalendarEditability } from '@/features/work-orders/calendar/editability';
import type { WorkOrderPriority, WorkOrderStatus } from '@/features/work-orders/types/workOrder';

export type CalendarWorkOrderSource = DueColumns & {
  id: string;
  title: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  teamId?: string | null;
  team_id?: string | null;
  createdDate?: string;
  created_date?: string;
  estimatedHours?: number | null;
  estimated_hours?: number | null;
  _isPendingSync?: boolean;
};

export type CalendarItem = {
  readonly workOrderId: string;
  readonly title: string;
  readonly placement: CalendarPlacement;
  readonly editability: CalendarEditability;
  readonly status: WorkOrderStatus;
  readonly priority: WorkOrderPriority;
  readonly overdue: boolean;
};

export type CalendarDragResult =
  | { readonly kind: 'applied'; readonly due: DueDate }
  | { readonly kind: 'rejected' };

function createdOnDay(source: CalendarWorkOrderSource): CalendarDay {
  const raw = source.createdDate ?? source.created_date;
  if (raw == null || raw === '') return todayLocal();

  const epochMs = Date.parse(raw);
  if (Number.isNaN(epochMs)) return todayLocal();

  const date = new Date(epochMs);
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

function estimatedHoursOf(source: CalendarWorkOrderSource): number | null {
  const hours = source.estimatedHours ?? source.estimated_hours;
  return hours == null ? null : hours;
}

export function toCalendarItem(
  source: CalendarWorkOrderSource,
  editability: CalendarEditability,
): CalendarItem {
  const due = parseDue(source);
  return {
    workOrderId: source.id,
    title: source.title,
    placement: placeWorkOrder(due, createdOnDay(source), estimatedHoursOf(source)),
    editability,
    status: source.status,
    priority: source.priority,
    overdue: isDueOverdue(due, source.status),
  };
}

export function applyCalendarDrag(
  editability: CalendarEditability,
  current: DueDate,
  write: DueWrite,
): CalendarDragResult {
  if (editability.kind !== 'editable') return { kind: 'rejected' };
  return { kind: 'applied', due: applyDueWrite(current, write) };
}
