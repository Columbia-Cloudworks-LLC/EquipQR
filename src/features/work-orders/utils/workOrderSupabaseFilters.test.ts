import { describe, it, expect, vi } from 'vitest';
import { applyWorkOrderSupabaseFilters } from './workOrderSupabaseFilters';

function createMockQuery() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const query = {
    eq: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'eq', args });
      return query;
    }),
    is: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'is', args });
      return query;
    }),
    lt: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'lt', args });
      return query;
    }),
    gte: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'gte', args });
      return query;
    }),
    not: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'not', args });
      return query;
    }),
    calls,
  };
  return query;
}

describe('applyWorkOrderSupabaseFilters', () => {
  it('applies status and unassigned assignee filters', () => {
    const query = createMockQuery();
    applyWorkOrderSupabaseFilters(query, {
      status: 'in_progress',
      assigneeId: 'unassigned',
    });

    expect(query.eq).toHaveBeenCalledWith('status', 'in_progress');
    expect(query.is).toHaveBeenCalledWith('assignee_id', null);
  });

  it('excludes terminal statuses for overdue when configured', () => {
    const query = createMockQuery();
    applyWorkOrderSupabaseFilters(
      query,
      { dueDateFilter: 'overdue' },
      { overdueExcludeTerminalStatuses: true },
    );

    expect(query.lt).toHaveBeenCalledWith('due_date', expect.any(String));
    expect(query.not).toHaveBeenCalledWith('status', 'eq', 'completed');
    expect(query.not).toHaveBeenCalledWith('status', 'eq', 'cancelled');
  });
});
