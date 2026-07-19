import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DateTimePicker } from '@/components/ui/datetime-picker';

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar-stub">Calendar</div>,
}));

describe('DateTimePicker', () => {
  it('opens with shortcut controls and applies the Now shortcut', () => {
    const onDateChange = vi.fn();
    const before = Date.now();

    render(
      <DateTimePicker
        date={new Date('2024-03-15T14:30:00Z')}
        onDateChange={onDateChange}
        showShortcuts
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /March/i }));

    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Now' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start of day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End of day' })).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Now' }));

    expect(onDateChange).toHaveBeenCalled();
    const nextDate = onDateChange.mock.calls.at(-1)?.[0] as Date;
    expect(nextDate.getTime()).toBeGreaterThanOrEqual(before);
  });
});
