import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { calendarDayToIso, parseCalendarDay, todayLocal, type CalendarDay } from './dueDate';
import type { CalendarItem } from './placement';
import type { CalendarRange } from './url';
import { localeFirstDay } from './adapter/toFullCalendar';
import { formatStatus, getStatusColor } from '@/features/work-orders/utils/workOrderHelpers';
import { cn } from '@/lib/utils';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';

interface WorkOrderAgendaProps {
  items: readonly CalendarItem[];
  range: CalendarRange;
  anchor: CalendarDay;
  onDateChange: (day: CalendarDay) => void;
  onRangeChange: (range: CalendarRange) => void;
  onSelect: (id: string) => void;
}

export function WorkOrderAgenda({ items, range, anchor, onDateChange, onRangeChange, onSelect }: WorkOrderAgendaProps) {
  const { formatTime } = useFormatTimestamp();
  // A shared month link opens the week containing its anchor; its URL stays intact.
  const grain = range === 'day' ? 'day' : 'week';
  const anchorDate = new Date(anchor.y, anchor.m - 1, anchor.d);
  const start = new Date(anchorDate);
  if (grain === 'week') start.setDate(start.getDate() - (start.getDay() - localeFirstDay() + 7) % 7);
  const days = Array.from({ length: grain === 'day' ? 1 : 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    return date;
  });
  const move = (direction: number) => {
    const next = new Date(anchorDate);
    next.setDate(next.getDate() + direction * days.length);
    onDateChange(todayLocal(next.getTime()));
  };
  const dayLabel = (date: Date) => date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  const grouped = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const p = item.placement;
    const day = p.kind === 'timed' ? todayLocal(p.dueAt.epochMs) : p.kind === 'dueDay' ? p.day : p.createdOn;
    const key = calendarDayToIso(day);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return (
    <section className="space-y-4" aria-label="Work order agenda" data-testid="work-order-agenda">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Agenda range">
          {(['day', 'week'] as const).map(value => (
            <Button key={value} variant={grain === value ? 'secondary' : 'outline'} className="h-11" aria-pressed={grain === value} onClick={() => onRangeChange(value)}>
              {value === 'day' ? 'Day' : 'Week'}
            </Button>
          ))}
          <Button variant="outline" className="h-11" onClick={() => onDateChange(todayLocal())}>Today</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label={`Previous ${grain}`} onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Input type="date" aria-label="Agenda date" className="h-11 min-w-0 flex-1" value={calendarDayToIso(anchor)} onChange={event => {
            const day = parseCalendarDay(event.target.value);
            if (day) onDateChange(day);
          }} />
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label={`Next ${grain}`} onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <h2 className="text-base font-semibold" aria-live="polite">{grain === 'day' ? dayLabel(anchorDate) : `Week of ${dayLabel(start)}`}</h2>
        <p className="text-xs text-muted-foreground">Local dates and times. Unscheduled work appears on its creation date.</p>
      </div>
      {days.map(date => {
        const key = calendarDayToIso(todayLocal(date.getTime()));
        const rows = [...(grouped.get(key) ?? [])].sort((a, b) => {
          const time = (item: CalendarItem) => item.placement.kind === 'timed' ? item.placement.dueAt.epochMs : 0;
          return time(a) - time(b) || a.title.localeCompare(b.title);
        });
        return (
          <section key={key} aria-label={dayLabel(date)} className="space-y-2">
            <h3 className="border-b pb-2 text-sm font-semibold">{dayLabel(date)}</h3>
            {rows.length === 0 ? <p className="py-2 text-sm text-muted-foreground">No work orders for this date.</p> : (
              <ul className="space-y-2">
                {rows.map(item => (
                  <li key={item.workOrderId}>
                    <button type="button" onClick={() => onSelect(item.workOrderId)} className={cn('w-full rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', item.status === 'cancelled' && 'opacity-60')} aria-label={`View ${item.title}`}>
                      <span className="block break-words font-medium">{item.title}</span>
                      <span className="my-1 block text-sm">
                        {item.placement.kind === 'timed' ? `Due ${formatTime(item.placement.dueAt.epochMs)}` : item.placement.kind === 'unscheduled' ? 'Unscheduled' : 'All-day due date'}
                        {item.overdue && <span className="ml-2 font-medium text-destructive">Overdue</span>}
                      </span>
                      <Badge className={getStatusColor(item.status)}>{formatStatus(item.status)}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </section>
  );
}
