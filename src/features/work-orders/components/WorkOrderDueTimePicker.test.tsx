import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  formatDueTimeParts,
  parseDueTimeValue,
  WorkOrderDueTimePicker,
} from './WorkOrderDueTimePicker';

describe('parseDueTimeValue and formatDueTimeParts', () => {
  it('parses 24-hour times into 12-hour parts and formats back', () => {
    expect(parseDueTimeValue('')).toBeNull();
    expect(parseDueTimeValue('00:05')).toEqual({ hour12: '12', minute: '05', period: 'AM' });
    expect(parseDueTimeValue('09:30')).toEqual({ hour12: '9', minute: '30', period: 'AM' });
    expect(parseDueTimeValue('12:00')).toEqual({ hour12: '12', minute: '00', period: 'PM' });
    expect(parseDueTimeValue('15:40')).toEqual({ hour12: '3', minute: '40', period: 'PM' });

    expect(formatDueTimeParts('12', '05', 'AM')).toBe('00:05');
    expect(formatDueTimeParts('9', '30', 'AM')).toBe('09:30');
    expect(formatDueTimeParts('12', '00', 'PM')).toBe('12:00');
    expect(formatDueTimeParts('3', '40', 'PM')).toBe('15:40');
  });
});

describe('WorkOrderDueTimePicker', () => {
  it('renders discrete hour, minute, and AM/PM selects without a clear button when empty', () => {
    const onChange = vi.fn();

    render(<WorkOrderDueTimePicker value="" onChange={onChange} />);

    expect(screen.getByRole('combobox', { name: 'Due hour' })).toHaveTextContent('Hour');
    expect(screen.getByRole('combobox', { name: 'Due minute' })).toHaveTextContent('Min');
    expect(screen.getByRole('combobox', { name: 'Due period' })).toHaveTextContent('AM/PM');
    expect(screen.queryByRole('button', { name: 'Clear due time' })).not.toBeInTheDocument();
  });

  it('defaults minute and period when selecting an hour from an empty state', async () => {
    const onChange = vi.fn();

    render(<WorkOrderDueTimePicker value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Due hour' }));
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByRole('option', { name: '3' }));

    expect(onChange).toHaveBeenCalledWith('03:00');
  });

  it('updates minute and period on a timed value and supports clearing', async () => {
    const onChange = vi.fn();

    const { rerender } = render(<WorkOrderDueTimePicker value="03:00" onChange={onChange} />);

    expect(screen.getByRole('combobox', { name: 'Due hour' })).toHaveTextContent('3');
    expect(screen.getByRole('combobox', { name: 'Due minute' })).toHaveTextContent('00');
    expect(screen.getByRole('combobox', { name: 'Due period' })).toHaveTextContent('AM');

    fireEvent.click(screen.getByRole('combobox', { name: 'Due minute' }));
    const minuteListbox = await screen.findByRole('listbox');
    fireEvent.click(within(minuteListbox).getByRole('option', { name: '40' }));
    expect(onChange).toHaveBeenCalledWith('03:40');

    rerender(<WorkOrderDueTimePicker value="03:40" onChange={onChange} />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Due period' }));
    const periodListbox = await screen.findByRole('listbox');
    fireEvent.click(within(periodListbox).getByRole('option', { name: 'PM' }));
    expect(onChange).toHaveBeenCalledWith('15:40');

    rerender(<WorkOrderDueTimePicker value="15:40" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear due time' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('preserves non-5-minute increments from existing timestamps', () => {
    render(<WorkOrderDueTimePicker value="14:17" onChange={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: 'Due hour' })).toHaveTextContent('2');
    expect(screen.getByRole('combobox', { name: 'Due minute' })).toHaveTextContent('17');
    expect(screen.getByRole('combobox', { name: 'Due period' })).toHaveTextContent('PM');
  });
});
