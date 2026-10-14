import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReviewMilestone } from './useReviewMilestone';

type CountResult = { count: number | null; error: Error | null };

const counts = vi.hoisted(() => ({
  work_orders: { count: 0, error: null } as CountResult,
  quickbooks_export_logs: { count: 0, error: null } as CountResult,
  filters: [] as Array<{ table: string; column: string; value: string }>,
  tables: [] as string[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: 'work_orders' | 'quickbooks_export_logs') => {
      counts.tables.push(table);
      const builder = {
        select: () => builder,
        eq: (column: string, value: string) => {
          counts.filters.push({ table, column, value });
          return builder;
        },
        then: (resolve: (value: CountResult) => unknown) => resolve(counts[table]),
      };
      return builder;
    },
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useReviewMilestone', () => {
  beforeEach(() => {
    counts.work_orders = { count: 0, error: null };
    counts.quickbooks_export_logs = { count: 0, error: null };
    counts.filters = [];
    counts.tables = [];
  });

  it('is reached at 10 completed work orders without counting invoices', async () => {
    counts.work_orders = { count: 10, error: null };
    const { result } = renderHook(() => useReviewMilestone('org-1', true), { wrapper });

    await waitFor(() => expect(result.current.data).toBe(true));
    expect(counts.tables).toEqual(['work_orders']);
    expect(counts.filters).toEqual([
      { table: 'work_orders', column: 'organization_id', value: 'org-1' },
      { table: 'work_orders', column: 'status', value: 'completed' },
    ]);
  });

  it('is reached at 5 successful QuickBooks exports scoped to the organization', async () => {
    counts.work_orders = { count: 3, error: null };
    counts.quickbooks_export_logs = { count: 5, error: null };
    const { result } = renderHook(() => useReviewMilestone('org-1', true), { wrapper });

    await waitFor(() => expect(result.current.data).toBe(true));
    expect(counts.filters).toContainEqual({
      table: 'quickbooks_export_logs',
      column: 'organization_id',
      value: 'org-1',
    });
    expect(counts.filters).toContainEqual({
      table: 'quickbooks_export_logs',
      column: 'status',
      value: 'success',
    });
  });

  it('is not reached below both thresholds', async () => {
    counts.work_orders = { count: 9, error: null };
    counts.quickbooks_export_logs = { count: 4, error: null };
    const { result } = renderHook(() => useReviewMilestone('org-1', true), { wrapper });

    await waitFor(() => expect(result.current.data).toBe(false));
  });

  it('does not query when disabled', () => {
    renderHook(() => useReviewMilestone('org-1', false), { wrapper });
    expect(counts.tables).toEqual([]);
  });
});
