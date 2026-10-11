import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { useWorkOrderQuickBooksExportState } from './useWorkOrderQuickBooksExportState';

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { id: 'org-1' } }),
}));

vi.mock('@/hooks/useQuickBooksAccess', () => ({
  useQuickBooksAccess: () => ({ data: true, isLoading: false }),
}));

vi.mock('@/lib/flags', () => ({
  isQuickBooksEnabled: () => true,
}));

vi.mock('@/services/quickbooks', () => ({
  getConnectionStatus: async () => ({ isConnected: true }),
  getTeamCustomerMapping: async () => ({ quickbooks_customer_id: 'cust-1' }),
}));

vi.mock('@/hooks/useExportToQuickBooks', () => ({
  QUICKBOOKS_EXPORT_MUTATION_KEY: ['quickbooks', 'export-invoice'],
  useQuickBooksLastExport: () => ({ data: null }),
}));

function setup(workOrderId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(
    () => ({
      state: useWorkOrderQuickBooksExportState({ workOrderId, teamId: 'team-1', workOrderStatus: 'completed' }),
      // Stands in for InvoiceReviewDialog, which runs the export with its own mutation.
      dialogExport: useMutation({
        mutationKey: ['quickbooks', 'export-invoice'],
        mutationFn: (_variables: { workOrderId: string }) => new Promise<void>(() => {}),
      }),
    }),
    { wrapper },
  );
}

describe('useWorkOrderQuickBooksExportState', () => {
  it('reports an export started by another component for the same work order', async () => {
    const { result } = setup('wo-1');
    expect(result.current.state.isExporting).toBe(false);

    act(() => result.current.dialogExport.mutate({ workOrderId: 'wo-1' }));

    await waitFor(() => expect(result.current.state.isExporting).toBe(true));
    expect(result.current.state.isLoading).toBe(true);
  });

  it('ignores exports for other work orders', async () => {
    const { result } = setup('wo-1');

    act(() => result.current.dialogExport.mutate({ workOrderId: 'wo-2' }));

    await waitFor(() => expect(result.current.dialogExport.isPending).toBe(true));
    expect(result.current.state.isExporting).toBe(false);
  });
});
