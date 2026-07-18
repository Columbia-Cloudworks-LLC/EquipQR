import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useExportToQuickBooks } from './useExportToQuickBooks';

const mockFunctionsInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function createInvokeError(message: string, body?: unknown) {
  const response = new Response(body === undefined ? '' : JSON.stringify(body), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

  return Object.assign(new Error(message), { context: response });
}

describe('useExportToQuickBooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces allowlisted JSON error payloads from non-2xx invoke responses', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: createInvokeError('Edge Function returned a non-2xx status code', {
        error: 'Work order not found',
      }),
    });

    const { result } = renderHook(() => useExportToQuickBooks(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync('wo-missing')).rejects.toThrow('Work order not found');
  });

  it('falls back to invoke error message when response body has no error field', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: createInvokeError('Edge Function returned a non-2xx status code', {
        success: false,
      }),
    });

    const { result } = renderHook(() => useExportToQuickBooks(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync('wo-missing')).rejects.toThrow(
      'Edge Function returned a non-2xx status code',
    );
  });

  it('falls back to invoke error message when response body is not JSON', async () => {
    const response = new Response('not-json', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
    const invokeError = Object.assign(new Error('Failed to load work order'), {
      context: response,
    });

    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: invokeError,
    });

    const { result } = renderHook(() => useExportToQuickBooks(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync('wo-missing')).rejects.toThrow('Failed to load work order');
  });

  it('returns mapped export result on success', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        success: true,
        invoice_id: 'inv-123',
        invoice_number: '1001',
        is_update: false,
        environment: 'sandbox',
      },
      error: null,
    });

    const { result } = renderHook(() => useExportToQuickBooks(), {
      wrapper: createWrapper(),
    });

    const exportResult = await result.current.mutateAsync('wo-123');
    expect(exportResult).toEqual({
      success: true,
      invoiceId: 'inv-123',
      invoiceNumber: '1001',
      isUpdate: false,
      environment: 'sandbox',
    });
  });
});
