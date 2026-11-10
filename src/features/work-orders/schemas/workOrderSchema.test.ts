import { describe, expect, it } from 'vitest';
import {
  getDefaultWorkOrderFormValues,
  historicalTimelineEventSchema,
  workOrderFormSchema,
  workOrderPrioritySchema,
  workOrderStatusSchema,
} from './workOrderSchema';

const minimal = { title: 'Inspect pump', equipmentId: 'eq-1', priority: 'medium' as const };

function messages(input: Record<string, unknown>): string[] {
  const result = workOrderFormSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

describe('workOrderFormSchema', () => {
  it('defaults dueDateHasTime to false', () => {
    const parsed = workOrderFormSchema.parse(minimal);

    expect(parsed.dueDateHasTime).toBe(false);
    expect(getDefaultWorkOrderFormValues().dueDateHasTime).toBe(false);
  });

  it('fills defaults for description and the boolean flags', () => {
    expect(workOrderFormSchema.parse(minimal)).toEqual({
      ...minimal,
      description: '',
      dueDateHasTime: false,
      hasPM: false,
      isHistorical: false,
      quickBooksSyncReady: false,
    });
  });

  it('requires a title of at most 100 characters', () => {
    expect(messages({ ...minimal, title: '' })).toEqual(['title: Title is required']);
    expect(messages({ ...minimal, title: 'x'.repeat(101) })).toEqual(['title: Title must be less than 100 characters']);
    expect(messages({ ...minimal, title: 'x'.repeat(100) })).toEqual([]);
  });

  it('limits descriptions to 1000 characters', () => {
    expect(messages({ ...minimal, description: 'x'.repeat(1001) })).toEqual([
      'description: Description must be less than 1000 characters',
    ]);
  });

  it('requires equipment and a known priority', () => {
    expect(messages({ ...minimal, equipmentId: '' })).toEqual(['equipmentId: Equipment is required']);
    expect(messages({ ...minimal, priority: 'urgent' })).toHaveLength(1);
  });

  it('keeps estimated hours between 0 and 10000', () => {
    expect(messages({ ...minimal, estimatedHours: -1 })).toEqual(['estimatedHours: Estimated hours cannot be negative']);
    expect(messages({ ...minimal, estimatedHours: 10001 })).toEqual(['estimatedHours: Estimated hours seems too high']);
    expect(messages({ ...minimal, estimatedHours: null })).toEqual([]);
  });

  it('normalizes an empty assignee to unassigned (null) and keeps real ids', () => {
    expect(workOrderFormSchema.parse({ ...minimal, assigneeId: '' }).assigneeId).toBeNull();
    expect(workOrderFormSchema.parse({ ...minimal, assigneeId: 'user-1' }).assigneeId).toBe('user-1');
    expect(workOrderFormSchema.parse({ ...minimal, assigneeId: null }).assigneeId).toBeNull();
  });

  it('requires a status only for historical work orders', () => {
    expect(messages({ ...minimal, isHistorical: true })).toEqual([
      'status: Status is required for historical work orders',
    ]);
    expect(messages({ ...minimal, isHistorical: true, status: 'accepted' })).toEqual([]);
    expect(messages({ ...minimal, isHistorical: false })).toEqual([]);
  });

  it('requires a past or present service date when logging completed work', () => {
    const logged = { ...minimal, isHistorical: true, status: 'completed' };
    const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    expect(messages(logged)).toEqual(['completedDate: Completed / service date is required']);
    expect(messages({ ...logged, completedDate: new Date('2024-03-05T12:00:00') })).toEqual([]);
    expect(messages({ ...logged, completedDate: new Date() })).toEqual([]);
    expect(messages({ ...logged, completedDate: tomorrow })).toEqual([
      'completedDate: Completed / service date cannot be in the future',
    ]);
  });

  it('keeps logged work out of QuickBooks unless opted in, and rejects negative hours', () => {
    expect(workOrderFormSchema.parse(minimal).quickBooksSyncReady).toBe(false);
    expect(workOrderFormSchema.parse({ ...minimal, quickBooksSyncReady: true }).quickBooksSyncReady).toBe(true);
    expect(messages({ ...minimal, equipmentWorkingHours: -5 })).toEqual([
      'equipmentWorkingHours: Hours cannot be negative',
    ]);
  });

  it('validates historical timeline events', () => {
    const event = { newStatus: 'in_progress', changedAt: '2026-01-02T10:00:00Z', assigneeId: null };
    expect(messages({ ...minimal, historicalTimelineEvents: [event] })).toEqual([]);
    expect(messages({ ...minimal, historicalTimelineEvents: [{ ...event, changedAt: '' }] })).toHaveLength(1);
    expect(messages({ ...minimal, historicalTimelineEvents: [{ ...event, newStatus: 'lost' }] })).toHaveLength(1);
  });
});

describe('enum schemas', () => {
  it('accepts every work order status and priority the app uses', () => {
    for (const status of ['submitted', 'accepted', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled']) {
      expect(workOrderStatusSchema.safeParse(status).success).toBe(true);
    }
    for (const priority of ['low', 'medium', 'high']) {
      expect(workOrderPrioritySchema.safeParse(priority).success).toBe(true);
    }
    expect(workOrderStatusSchema.safeParse('done').success).toBe(false);
    expect(historicalTimelineEventSchema.safeParse({ newStatus: 'accepted', changedAt: 'x' }).success).toBe(true);
  });
});

describe('getDefaultWorkOrderFormValues', () => {
  it('starts a blank, unassigned, medium-priority work order', () => {
    expect(getDefaultWorkOrderFormValues()).toMatchObject({
      title: '',
      equipmentId: '',
      priority: 'medium',
      assigneeId: null,
      pmTemplateId: null,
      isHistorical: false,
      status: undefined,
    });
  });

  it('pre-selects equipment and a completed status dated today for historical entries', () => {
    const defaults = getDefaultWorkOrderFormValues({ equipmentId: 'eq-9', isHistorical: true });

    expect(defaults).toMatchObject({
      equipmentId: 'eq-9',
      isHistorical: true,
      status: 'completed',
      quickBooksSyncReady: false,
    });
    expect(defaults.completedDate).toBeInstanceOf(Date);
    expect(defaults.completedDate?.toDateString()).toBe(new Date().toDateString());
    expect(defaults.historicalStartDate?.getTime()).toBe(defaults.completedDate?.getTime());
  });
});
