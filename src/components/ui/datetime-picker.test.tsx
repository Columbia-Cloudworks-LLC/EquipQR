import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateTimePicker } from '@/components/ui/datetime-picker';

describe('DateTimePicker', () => {
  it('opens with shortcut controls when enabled', async () => {
    const user = userEvent.setup();
    const onDateChange = vi.fn();

    render(
      <DateTimePicker
        date={new Date('2024-03-15T14:30:00Z')}
        onDateChange={onDateChange}
        showShortcuts
      />,
    );

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Now' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start of day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End of day' })).toBeInTheDocument();
  });

  it('calls onDateChange when the Now shortcut is clicked', async () => {
    const user = userEvent.setup();
    const onDateChange = vi.fn();
    const before = Date.now();

    render(
      <DateTimePicker
        date={new Date('2024-03-15T14:30:00Z')}
        onDateChange={onDateChange}
        showShortcuts
      />,
    );

    await user.click(screen.getByRole('button', { name: /March/i }));
    await user.click(screen.getByRole('button', { name: 'Now' }));

    expect(onDateChange).toHaveBeenCalled();
    const nextDate = onDateChange.mock.calls.at(-1)?.[0] as Date;
    expect(nextDate.getTime()).toBeGreaterThanOrEqual(before);
  });
});
