import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type EdgeError = (Error & { context?: unknown }) | null;
const backend = vi.hoisted(() => ({
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
  statusRows: [] as unknown[] | null,
  rpcError: null as Error | null,
  invokeCalls: [] as { name: string; body: unknown }[],
  invokeResult: { data: null as unknown, error: null as EdgeError },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      backend.rpcCalls.push({ fn, args });
      if (backend.rpcError) return { data: null, error: backend.rpcError };
      return { data: fn === 'get_support_access_status' ? backend.statusRows : null, error: null };
    },
    functions: {
      invoke: async (name: string, options: { body: unknown }) => {
        backend.invokeCalls.push({ name, body: options.body });
        return backend.invokeResult;
      },
    },
  },
}));

const {
  DEFAULT_SUPPORT_ACCESS_HOURS,
  SUPPORT_ACCESS_DURATIONS,
  grantSupportAccess,
  useGrantSupportAccess,
  useRevokeSupportAccess,
  useSupportAccessStatus,
} = await import('./useSupportAccess');

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

const grantRow = { expiresAt: '2026-03-25T12:00:00Z', extended: false, operatorsNotified: true };

function edgeError(message: string, context?: unknown): EdgeError {
  const error: Error & { context?: unknown } = new Error(message);
  error.context = context;
  return error;
}

describe('useSupportAccess', () => {
  beforeEach(() => {
    backend.rpcCalls = [];
    backend.statusRows = [];
    backend.rpcError = null;
    backend.invokeCalls = [];
    backend.invokeResult = { data: grantRow, error: null };
  });

  it('offers 24h, 72h and 7-day grants, defaulting to 72 hours', () => {
    expect(SUPPORT_ACCESS_DURATIONS.map((d) => d.label)).toEqual(['24 hours', '72 hours', '7 days']);
    expect(DEFAULT_SUPPORT_ACCESS_HOURS).toBe(72);
  });

  describe('useSupportAccessStatus', () => {
    it('returns the first status row for the organization', async () => {
      backend.statusRows = [{ expires_at: '2026-03-25T12:00:00Z' }, { expires_at: 'older' }];

      const { result } = renderHook(() => useSupportAccessStatus('org-1'), { wrapper: wrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ expires_at: '2026-03-25T12:00:00Z' });
      expect(backend.rpcCalls).toEqual([{ fn: 'get_support_access_status', args: { p_organization_id: 'org-1' } }]);
    });

    it.each([
      ['no rows', []],
      ['a null result', null],
    ])('returns null when there is %s', async (_label, rows) => {
      backend.statusRows = rows;

      const { result } = renderHook(() => useSupportAccessStatus('org-1'), { wrapper: wrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeNull();
    });

    it('surfaces RPC errors', async () => {
      backend.rpcError = new Error('permission denied');

      const { result } = renderHook(() => useSupportAccessStatus('org-1'), { wrapper: wrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('permission denied');
    });

    it('does not query without an organization', async () => {
      const { result } = renderHook(() => useSupportAccessStatus(undefined), { wrapper: wrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(backend.rpcCalls).toEqual([]);
    });

    it('sends an empty organization id if a disabled status query is refetched manually', async () => {
      const { result } = renderHook(() => useSupportAccessStatus(undefined), { wrapper: wrapper() });

      await act(() => result.current.refetch());

      expect(backend.rpcCalls).toEqual([{ fn: 'get_support_access_status', args: { p_organization_id: '' } }]);
    });
  });

  describe('grantSupportAccess', () => {
    const input = { organizationId: 'org-1', durationHours: 24 as const, source: 'bug_report' as const, ticketRef: 'T-9' };

    it('returns the validated grant', async () => {
      await expect(grantSupportAccess(input)).resolves.toEqual(grantRow);
      expect(backend.invokeCalls).toEqual([{ name: 'support-access', body: input }]);
    });

    it('rejects an unexpected response shape', async () => {
      backend.invokeResult = { data: { expiresAt: 5 }, error: null };

      await expect(grantSupportAccess(input)).rejects.toThrow('Could not grant support access');
    });

    it('shows the server message, or its error code when there is no message', async () => {
      backend.invokeResult = {
        data: null,
        error: edgeError('non-2xx', Response.json({ error: 'FORBIDDEN', message: 'Only owners can grant access' }, { status: 403 })),
      };
      await expect(grantSupportAccess(input)).rejects.toThrow('Only owners can grant access');

      backend.invokeResult = { data: null, error: edgeError('non-2xx', Response.json({ error: 'RATE_LIMITED' }, { status: 429 })) };
      await expect(grantSupportAccess(input)).rejects.toThrow('RATE_LIMITED');
    });

    it.each([
      ['a non-JSON error body', new Response('Bad Gateway', { status: 502 })],
      ['an error body without a code', Response.json({ nope: true }, { status: 500 })],
      ['no HTTP response', undefined],
    ])('falls back to a generic message for %s', async (_label, context) => {
      backend.invokeResult = { data: null, error: edgeError('Failed to send a request', context) };

      await expect(grantSupportAccess(input)).rejects.toThrow('Could not grant support access');
    });
  });

  describe('mutations', () => {
    async function statusAndMutation<T>(organizationId: string | undefined, useMutationHook: (id: string | undefined) => T) {
      const Wrapper = wrapper();
      const { result } = renderHook(
        () => ({ status: useSupportAccessStatus(organizationId), mutation: useMutationHook(organizationId) }),
        { wrapper: Wrapper },
      );
      if (organizationId) await waitFor(() => expect(result.current.status.isSuccess).toBe(true));
      return result;
    }

    it('granting from settings refreshes the status query', async () => {
      const result = await statusAndMutation('org-1', useGrantSupportAccess);
      backend.statusRows = [{ expires_at: 'new' }];

      await act(() => result.current.mutation.mutateAsync(168));

      expect(backend.invokeCalls[0]?.body).toEqual({ organizationId: 'org-1', durationHours: 168, source: 'settings' });
      await waitFor(() => expect(result.current.status.data).toEqual({ expires_at: 'new' }));
    });

    it('revoking calls the owner RPC and refreshes the status query', async () => {
      backend.statusRows = [{ expires_at: 'active' }];
      const result = await statusAndMutation('org-1', useRevokeSupportAccess);
      backend.statusRows = [];

      await act(() => result.current.mutation.mutateAsync());

      expect(backend.rpcCalls.filter((c) => c.fn === 'revoke_support_access')).toEqual([
        { fn: 'revoke_support_access', args: { p_organization_id: 'org-1' } },
      ]);
      await waitFor(() => expect(result.current.status.data).toBeNull());
    });

    it('revoke surfaces RPC errors', async () => {
      const result = await statusAndMutation('org-1', useRevokeSupportAccess);
      backend.rpcError = new Error('not owner');

      await expect(act(() => result.current.mutation.mutateAsync())).rejects.toThrow('not owner');
    });

    it('sends an empty organization id when none is selected', async () => {
      const grant = await statusAndMutation(undefined, useGrantSupportAccess);
      await act(() => grant.current.mutation.mutateAsync(24));
      expect(backend.invokeCalls[0]?.body).toMatchObject({ organizationId: '' });

      const revoke = await statusAndMutation(undefined, useRevokeSupportAccess);
      await act(() => revoke.current.mutation.mutateAsync());
      expect(backend.rpcCalls).toEqual([{ fn: 'revoke_support_access', args: { p_organization_id: '' } }]);
    });
  });
});
