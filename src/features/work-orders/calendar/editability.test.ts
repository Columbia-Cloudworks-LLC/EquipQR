import { describe, expect, it } from 'vitest';
import { calendarEditability, type CalendarEditability } from '@/features/work-orders/calendar';

describe('calendarEditability', () => {
  it('is readOnly locked when the engine can edit a locked work order', () => {
    expect(calendarEditability({
      engineCanEdit: true,
      status: 'completed',
      isOfflinePending: false,
    })).toEqual({ kind: 'readOnly', reason: 'locked' });
  });

  it('is forbidden when the engine cannot edit', () => {
    expect(calendarEditability({
      engineCanEdit: false,
      status: 'submitted',
      isOfflinePending: false,
    })).toEqual({ kind: 'readOnly', reason: 'forbidden' });
  });

  it('is offlinePending while a row is waiting to sync', () => {
    expect(calendarEditability({
      engineCanEdit: true,
      status: 'submitted',
      isOfflinePending: true,
    })).toEqual({ kind: 'readOnly', reason: 'offlinePending' });
  });

  it('is editable when the engine can edit an open work order', () => {
    const result: CalendarEditability = calendarEditability({
      engineCanEdit: true,
      status: 'in_progress',
      isOfflinePending: false,
    });
    expect(result).toEqual({ kind: 'editable' });
  });
});
