import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkOrderAgenda } from './WorkOrderAgenda';
import type { CalendarItem } from './placement';
import { todayLocal } from './dueDate';

vi.mock('@/hooks/useFormatTimestamp', () => ({
  useFormatTimestamp: () => ({
    formatTime: (ms: number) => `Formatted: ${ms}`,
    timeZone: 'UTC',
  })
}));

describe('WorkOrderAgenda', () => {
  const dummyAnchor = todayLocal(12345);
  
  it('renders without items', () => {
    render(<WorkOrderAgenda 
      items={[]} 
      range="day" 
      anchor={dummyAnchor} 
      onDateChange={vi.fn()} 
      onRangeChange={vi.fn()} 
      onSelect={vi.fn()} 
    />);
    expect(screen.getByText('No work orders for this date.')).toBeInTheDocument();
  });

  it('renders items with useFormatTimestamp for timed placements', () => {
    const dueAt = new Date(2026, 0, 1, 12).getTime();
    const agendaDay = todayLocal(dueAt);
    const items: CalendarItem[] = [
      {
        workOrderId: 'wo-1',
        title: 'Fix AC',
        status: 'open',
        overdue: false,
        placement: { kind: 'timed', dueAt: { epochMs: dueAt } }
      },
      {
        workOrderId: 'wo-2',
        title: 'Paint Wall',
        status: 'open',
        overdue: false,
        placement: { kind: 'unscheduled', createdOn: agendaDay }
      }
    ];

    render(<WorkOrderAgenda 
      items={items} 
      range="day" 
      anchor={agendaDay}
      onDateChange={vi.fn()} 
      onRangeChange={vi.fn()} 
      onSelect={vi.fn()} 
    />);

    expect(screen.getByText('Fix AC')).toBeInTheDocument();
    expect(screen.getByText(`Due Formatted: ${new Date(2026, 0, 1, 12).getTime()}`)).toBeInTheDocument();
    expect(screen.getByText('Paint Wall')).toBeInTheDocument();
    expect(screen.getByText('Unscheduled')).toBeInTheDocument();
  });

  it('calls onDateChange with calendarDayInTimeZone on Today click', () => {
    const onDateChange = vi.fn();
    render(<WorkOrderAgenda 
      items={[]} 
      range="day" 
      anchor={dummyAnchor} 
      onDateChange={onDateChange} 
      onRangeChange={vi.fn()} 
      onSelect={vi.fn()} 
    />);

    screen.getByRole('button', { name: 'Today' }).click();
    expect(onDateChange).toHaveBeenCalled();
  });

  it('groups unscheduled items using createdEpochMs in the configured timeZone', () => {
    // 2026-01-02T00:30:00Z in UTC is 2026-01-02
    const createdEpochMs = Date.parse('2026-01-02T00:30:00Z');
    const items: CalendarItem[] = [
      {
        workOrderId: 'wo-unscheduled-tz',
        title: 'Calibrate Sensor',
        status: 'open',
        overdue: false,
        placement: {
          kind: 'unscheduled',
          createdOn: { y: 2026, m: 1, d: 1 },
          createdEpochMs,
        },
      },
    ];

    render(
      <WorkOrderAgenda
        items={items}
        range="day"
        anchor={{ y: 2026, m: 1, d: 2 }}
        onDateChange={vi.fn()}
        onRangeChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Calibrate Sensor')).toBeInTheDocument();
  });

  it('calculates overdue status for all-day items in configured timeZone', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T12:00:00Z'));

    const items: CalendarItem[] = [
      {
        workOrderId: 'wo-today',
        title: 'Task Due Today',
        status: 'open',
        overdue: true,
        placement: {
          kind: 'dueDay',
          day: { y: 2026, m: 1, d: 2 },
        },
      },
      {
        workOrderId: 'wo-yesterday',
        title: 'Task Due Yesterday',
        status: 'open',
        overdue: false,
        placement: {
          kind: 'dueDay',
          day: { y: 2026, m: 1, d: 1 },
        },
      },
    ];

    render(
      <WorkOrderAgenda
        items={items}
        range="week"
        anchor={{ y: 2026, m: 1, d: 2 }}
        onDateChange={vi.fn()}
        onRangeChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    const todayButton = screen.getByText('Task Due Today').closest('button');
    expect(todayButton).not.toHaveTextContent('Overdue');

    const yesterdayButton = screen.getByText('Task Due Yesterday').closest('button');
    expect(yesterdayButton).toHaveTextContent('Overdue');

    vi.useRealTimers();
  });
});
