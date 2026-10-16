import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { persistDue } from '@/features/work-orders/calendar';
import { WorkOrderScheduling } from './WorkOrderScheduling';

describe('WorkOrderScheduling', () => {
  it('keeps the clock when the date changes on a timed due', () => {
    const setValue = vi.fn();
    const persisted = persistDue({
      kind: 'timed',
      at: { epochMs: new Date(2026, 2, 15, 14, 30).getTime() },
    });

    render(
      <WorkOrderScheduling
        values={{
          dueDate: persisted.dueDate,
          dueDateHasTime: persisted.dueDateHasTime,
          estimatedHours: null,
        }}
        errors={{}}
        setValue={setValue}
      />,
    );

    fireEvent.change(screen.getByLabelText('Work order due date'), { target: { value: '2026-03-20' } });

    expect(setValue).toHaveBeenCalledWith('dueDateHasTime', true);
    const dueDateCall = setValue.mock.calls.find((call) => call[0] === 'dueDate');
    expect(dueDateCall?.[1]).toEqual(expect.stringContaining('T'));
    const next = new Date(String(dueDateCall?.[1]));
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(2);
    expect(next.getDate()).toBe(20);
    expect(next.getHours()).toBe(14);
    expect(next.getMinutes()).toBe(30);
  });

  it('clears time and sets dueDateHasTime false', () => {
    const setValue = vi.fn();
    const persisted = persistDue({
      kind: 'timed',
      at: { epochMs: new Date(2026, 2, 15, 14, 30).getTime() },
    });

    render(
      <WorkOrderScheduling
        values={{
          dueDate: persisted.dueDate,
          dueDateHasTime: persisted.dueDateHasTime,
          estimatedHours: null,
        }}
        errors={{}}
        setValue={setValue}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear due time' }));

    expect(setValue).toHaveBeenCalledWith('dueDateHasTime', false);
    expect(setValue).toHaveBeenCalledWith('dueDate', '2026-03-15');
  });

  it('sets due time via discrete hour/minute/period selects', async () => {
    const setValue = vi.fn();

    render(
      <WorkOrderScheduling
        values={{
          dueDate: '2026-03-15',
          dueDateHasTime: false,
          estimatedHours: null,
        }}
        errors={{}}
        setValue={setValue}
      />,
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Due hour' }));
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByRole('option', { name: '3' }));

    expect(setValue).toHaveBeenCalledWith('dueDateHasTime', true);
    const dueDateCall = setValue.mock.calls.find((call) => call[0] === 'dueDate');
    const next = new Date(String(dueDateCall?.[1]));
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(2);
    expect(next.getDate()).toBe(15);
    expect(next.getHours()).toBe(3);
    expect(next.getMinutes()).toBe(0);
  });
});

