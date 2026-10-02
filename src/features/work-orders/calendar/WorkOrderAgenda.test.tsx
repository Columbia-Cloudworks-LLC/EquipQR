import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkOrderAgenda } from './WorkOrderAgenda';
import type { CalendarItem } from './placement';

vi.mock('@/hooks/useFormatTimestamp', () => ({
  useFormatTimestamp: () => ({
    formatTime: (ms: number) => `Formatted: ${ms}`,
  })
}));

describe('WorkOrderAgenda', () => {
  const dummyAnchor = { y: 2026, m: 1, d: 1 };
  
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
    const items: CalendarItem[] = [
      {
        workOrderId: 'wo-1',
        title: 'Fix AC',
        status: 'open',
        overdue: false,
        placement: { kind: 'timed', dueAt: { epochMs: 12345 } }
      },
      {
        workOrderId: 'wo-2',
        title: 'Paint Wall',
        status: 'open',
        overdue: false,
        placement: { kind: 'unscheduled', createdOn: dummyAnchor }
      }
    ];

    render(<WorkOrderAgenda 
      items={items} 
      range="day" 
      anchor={dummyAnchor} 
      onDateChange={vi.fn()} 
      onRangeChange={vi.fn()} 
      onSelect={vi.fn()} 
    />);

    expect(screen.getByText('Fix AC')).toBeInTheDocument();
    expect(screen.getByText('Due Formatted: 12345')).toBeInTheDocument();
    expect(screen.getByText('Paint Wall')).toBeInTheDocument();
    expect(screen.getByText('Unscheduled')).toBeInTheDocument();
  });
});
