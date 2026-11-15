import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildWorkOrderStatusUpdatePayload } from './workOrderUpdatePayload';

const NOW = '2026-03-04T05:06:07.000Z';

describe('buildWorkOrderStatusUpdatePayload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stamps completed_date when completing', () => {
    expect(buildWorkOrderStatusUpdatePayload('completed')).toEqual({
      status: 'completed',
      updated_at: NOW,
      completed_date: NOW,
    });
  });

  it.each(['submitted', 'assigned', 'in_progress'] as const)(
    'clears completed_date when reopening to %s',
    status => {
      expect(buildWorkOrderStatusUpdatePayload(status)).toEqual({
        status,
        updated_at: NOW,
        completed_date: null,
      });
    },
  );

  it('stamps acceptance_date and clears completed_date on accepted', () => {
    expect(buildWorkOrderStatusUpdatePayload('accepted')).toEqual({
      status: 'accepted',
      updated_at: NOW,
      acceptance_date: NOW,
      completed_date: null,
    });
  });

  it.each(['assigned', 'in_progress'] as const)(
    'sets assignee_id and stamps acceptance_date for %s with an assignee (Assign & Start)',
    status => {
      expect(buildWorkOrderStatusUpdatePayload(status, 'user-1')).toEqual({
        status,
        updated_at: NOW,
        assignee_id: 'user-1',
        acceptance_date: NOW,
        completed_date: null,
      });
    },
  );

  it('leaves assignee_id untouched when no assignee is given', () => {
    expect(buildWorkOrderStatusUpdatePayload('in_progress')).not.toHaveProperty('assignee_id');
  });

  it('unassigns without stamping acceptance_date when assignee is null', () => {
    expect(buildWorkOrderStatusUpdatePayload('assigned', null)).toEqual({
      status: 'assigned',
      updated_at: NOW,
      assignee_id: null,
      completed_date: null,
    });
  });

  it('does not stamp acceptance_date for on_hold even with an assignee', () => {
    expect(buildWorkOrderStatusUpdatePayload('on_hold', 'user-1')).toEqual({
      status: 'on_hold',
      updated_at: NOW,
      assignee_id: 'user-1',
    });
  });

  it.each(['on_hold', 'cancelled'] as const)('leaves completed_date untouched for %s', status => {
    const payload = buildWorkOrderStatusUpdatePayload(status);

    expect(payload).toEqual({ status, updated_at: NOW });
    expect(payload).not.toHaveProperty('completed_date');
  });
});
