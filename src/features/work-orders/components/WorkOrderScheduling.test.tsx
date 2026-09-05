import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

    fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '2026-03-20' } });

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

    fireEvent.change(screen.getByLabelText('Due time'), { target: { value: '' } });

    expect(setValue).toHaveBeenCalledWith('dueDateHasTime', false);
    expect(setValue).toHaveBeenCalledWith('dueDate', '2026-03-15');
  });
});
