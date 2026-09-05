import { describe, it, expect, vi } from 'vitest';
import { applyWorkOrderListContract, applyWorkOrderSupabaseFilters } from './workOrderSupabaseFilters';
import { parseWorkOrderListContract } from '@/features/work-orders/utils/workOrderListContract';
import { LIST_CONTRACT_NOW, parseInput } from '@/features/work-orders/utils/workOrderListContract.fixtures';

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
    lte: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'lte', args });
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
    or: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'or', args });
      return query;
    }),
    in: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'in', args });
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

  it('preserves extra builder methods on the returned query', () => {
    const query = Object.assign(createMockQuery(), {
      order: vi.fn(),
    });

    const result = applyWorkOrderSupabaseFilters(query, { status: 'submitted' });
    result.order('created_date', { ascending: false });

    expect(result.order).toHaveBeenCalledWith('created_date', { ascending: false });
  });
});

describe('applyWorkOrderListContract', () => {
  it('leaves search to the parent-column or() clause', () => {
    const query = createMockQuery();
    applyWorkOrderListContract(
      query,
      parseWorkOrderListContract(parseInput({ filters: { searchQuery: 'yard' } })),
      LIST_CONTRACT_NOW,
    );

    expect(query.or).not.toHaveBeenCalled();
  });

  it('applies assignee unassigned as no assignee and no effective team', () => {
    const query = createMockQuery();
    applyWorkOrderListContract(
      query,
      parseWorkOrderListContract(parseInput({ filters: { assigneeFilter: 'unassigned' } })),
      LIST_CONTRACT_NOW,
    );

    expect(query.is).toHaveBeenCalledWith('assignee_id', null);
    expect(query.or).toHaveBeenCalledWith('and(team_id.is.null,equipment.team_id.is.null)');
  });

  it('applies Sunday this_week bounds at fetch time', () => {
    const query = createMockQuery();
    applyWorkOrderListContract(
      query,
      parseWorkOrderListContract(parseInput({ filters: { dueDateFilter: 'this_week' } })),
      LIST_CONTRACT_NOW,
    );

    expect(query.gte).toHaveBeenCalledWith('due_date', expect.stringContaining('2026-08-30'));
    const endIso = query.lte.mock.calls[0]?.[1] as string;
    expect(new Date(endIso).getTime()).toBeGreaterThan(
      new Date('2026-09-05T00:00:00.000Z').getTime(),
    );
    expect(new Date(endIso).getTime()).toBeLessThan(
      new Date('2026-09-07T00:00:00.000Z').getTime(),
    );
  });

  it('applies unpaid invoices as exported plus null or collectible status', () => {
    const query = createMockQuery();
    applyWorkOrderListContract(
      query,
      parseWorkOrderListContract(parseInput({ filters: { invoiceFilter: 'unpaid' } })),
      LIST_CONTRACT_NOW,
    );

    expect(query.not).toHaveBeenCalledWith('quickbooks_invoice_id', 'is', null);
    expect(query.or).toHaveBeenCalledWith(
      expect.stringContaining('invoice_status.is.null'),
    );
    expect(query.or).toHaveBeenCalledWith(expect.stringContaining('draft'));
  });

  it('applies TopBar team as COALESCE on work_orders.team_id then equipment.team_id', () => {
    const query = createMockQuery();
    applyWorkOrderListContract(
      query,
      parseWorkOrderListContract(parseInput({ selectedTeamId: 'team-topbar' })),
      LIST_CONTRACT_NOW,
    );

    expect(query.or).toHaveBeenCalledWith(
      'team_id.eq.team-topbar,and(team_id.is.null,equipment.team_id.eq.team-topbar)',
    );
  });

  it('filters member access on equipment.team_id, not effective team', () => {
    const query = createMockQuery();
    applyWorkOrderListContract(
      query,
      parseWorkOrderListContract(
        parseInput({ isOrgAdmin: false, userTeamIds: ['team-access'] }),
      ),
      LIST_CONTRACT_NOW,
    );

    expect(query.in).toHaveBeenCalledWith('equipment.team_id', ['team-access']);
  });
});
