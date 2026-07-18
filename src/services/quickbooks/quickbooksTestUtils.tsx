import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

export function createQuickBooksTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithQuickBooksProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { initialEntries?: string[] },
) {
  const queryClient = createQuickBooksTestQueryClient();
  const { initialEntries, ...renderOptions } = options ?? {};

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
    renderOptions,
  );
}
