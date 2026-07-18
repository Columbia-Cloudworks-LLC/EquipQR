import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { registerTestQueryClient } from '@vitest-harness/query-client-registry';

export type TestQueryClientOptions = {
  gcTime?: number;
  staleTime?: number;
};

/** QueryClient tuned for unit tests (no retries). */
export function createTestQueryClient(options?: TestQueryClientOptions): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: options?.gcTime ?? 0,
        staleTime: options?.staleTime,
      },
      mutations: { retry: false },
    },
  });
  registerTestQueryClient(client);
  return client;
}

/** Minimal wrapper for renderHook tests that only need React Query. */
export function createQueryClientWrapper(options?: TestQueryClientOptions) {
  const queryClient = createTestQueryClient(options);
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/** Wrapper with MemoryRouter + React Query (common hook-test pattern). */
export function createRouterQueryClientWrapper(
  initialEntries: string[] = ['/'],
  options?: TestQueryClientOptions,
) {
  const queryClient = createTestQueryClient(options);
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}
