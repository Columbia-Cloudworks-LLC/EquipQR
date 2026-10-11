import React from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { useWorkOrderQuickBooksExportState } from './useWorkOrderQuickBooksExportState';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';

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
}));

const mockResolveQuickBooksCustomerId = vi.fn();

vi.mock('@/features/teams/services/customerAccountService', () => ({
  resolveQuickBooksCustomerId: (...args: unknown[]) => mockResolveQuickBooksCustomerId(...args),
}));

const mockLastExport = vi.fn();

vi.mock('@/hooks/useExportToQuickBooks', () => ({
  QUICKBOOKS_EXPORT_MUTATION_KEY: ['quickbooks', 'export-invoice'],
  useQuickBooksLastExport: () => ({ data: mockLastExport() }),
}));

function setup(workOrderId: string, workOrderStatus: WorkOrderStatus = 'completed') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(
    () => ({
      state: useWorkOrderQuickBooksExportState({ workOrderId, teamId: 'team-1', workOrderStatus }),
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
  beforeEach(() => {
    mockResolveQuickBooksCustomerId.mockReset();
    mockResolveQuickBooksCustomerId.mockResolvedValue('qb-cust-1');
    mockLastExport.mockReset();
    mockLastExport.mockReturnValue(null);
  });

  it('disables updating a linked invoice once the work order is reopened', async () => {
    mockLastExport.mockReturnValue({ quickbooks_invoice_id: 'inv-1', quickbooks_invoice_number: '1001' });
    const { result } = setup('wo-1', 'in_progress');

    await waitFor(() => expect(result.current.state.isLoading).toBe(false));
    expect(result.current.state.hasLinkedInvoice).toBe(true);
    expect(result.current.state.setupDisabled).toBe(true);
  });

  it('treats a customer mapping resolved through the team customer account as configured', async () => {
    const { result } = setup('wo-1');

    await waitFor(() => expect(mockResolveQuickBooksCustomerId).toHaveBeenCalledWith('org-1', 'team-1'));
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));
    expect(result.current.state.showSetupState).toBe(false);
    expect(result.current.state.setupDisabled).toBe(false);
  });

  it('shows the setup state when no customer mapping resolves', async () => {
    mockResolveQuickBooksCustomerId.mockResolvedValue(null);
    const { result } = setup('wo-1');

    await waitFor(() => expect(result.current.state.showSetupState).toBe(true));
  });

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
