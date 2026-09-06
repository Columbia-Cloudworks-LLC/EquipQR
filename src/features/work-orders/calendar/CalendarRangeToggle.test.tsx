import { fireEvent, render, screen } from '@vitest-harness/utils/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { CalendarRangeToggle } from '@/features/work-orders/calendar/CalendarRangeToggle';

describe('CalendarRangeToggle', () => {
  it('exposes month, week, and day options', () => {
    const onChange = vi.fn();
    render(<CalendarRangeToggle range="month" onChange={onChange} />);

    expect(screen.getByRole('radiogroup', { name: 'Calendar range' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Month' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(screen.getByRole('radio', { name: 'Day' }));
    expect(onChange).toHaveBeenCalledWith('day');
  });
});
