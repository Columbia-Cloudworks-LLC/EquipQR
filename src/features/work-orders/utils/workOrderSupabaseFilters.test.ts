import { describe, it, expect, vi } from 'vitest';
import { applyWorkOrderListContract, applyWorkOrderSupabaseFilters } from './workOrderSupabaseFilters';
import { parseWorkOrderListContract } from '@/features/work-orders/utils/workOrderListContract';
import { LIST_CONTRACT_NOW, parseInput } from '@/features/work-orders/utils/workOrderListContract.fixtures';
import { DEFAULT_WORK_ORDER_FILTERS } from '@/features/work-orders/hooks/workOrderFilterUtils';

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

  it('returns the same builder so extra methods are preserved', () => {
    const query = Object.assign(createMockQuery(), {
      order: vi.fn(),
    });

    const result = applyWorkOrderSupabaseFilters(query, { status: 'submitted' });

    expect(result).toBe(query);
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
    expect(query.is).toHaveBeenCalledWith('equipment.team_id', null);
    expect(query.or).not.toHaveBeenCalled();
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

  it('keeps Historical Only / Do Not Sync records out of the not-exported queue', () => {
    const query = createMockQuery();
    applyWorkOrderListContract(
      query,
      parseWorkOrderListContract(
        parseInput({ filters: { ...DEFAULT_WORK_ORDER_FILTERS, invoiceFilter: 'not_exported' } }),
      ),
      LIST_CONTRACT_NOW,
    );

    expect(query.is).toHaveBeenCalledWith('quickbooks_invoice_id', null);
    expect(query.is).toHaveBeenCalledWith('quickbooks_sync_excluded', false);
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

  it('applies TopBar team on equipment.team_id without a top-level or()', () => {
    const query = createMockQuery();
    applyWorkOrderListContract(
      query,
      parseWorkOrderListContract(parseInput({ selectedTeamId: 'team-topbar' })),
      LIST_CONTRACT_NOW,
    );

    expect(query.eq).toHaveBeenCalledWith('equipment.team_id', 'team-topbar');
    expect(query.or).not.toHaveBeenCalled();
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
