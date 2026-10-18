import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import ProvisionYardPage from './ProvisionYardPage';

const state = vi.hoisted(() => ({
  operator: { data: false as boolean | undefined, isLoading: false },
  list: vi.fn(),
}));

vi.mock('@/features/dfy/hooks/useDfyOperator', () => ({
  useIsDfyOperator: () => state.operator,
}));

vi.mock('@/features/dfy/services/dfyProvisioningService', () => ({
  dfyProvisioning: { list: state.list },
}));

vi.mock('@/features/dfy/components/NewYardForm', () => ({
  NewYardForm: () => <div data-testid="new-yard-form" />,
}));

vi.mock('@/features/dfy/components/ProvisionedYardDetail', () => ({
  ProvisionedYardDetail: () => <div data-testid="yard-detail" />,
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<ProvisionYardPage />, { wrapper });
}

describe('ProvisionYardPage', () => {
  beforeEach(() => {
    state.operator = { data: false, isLoading: false };
    state.list.mockReset();
  });

  it('shows nothing operational to non-operators and never lists yards', () => {
    renderPage();
    expect(screen.getByText('Page not available')).toBeInTheDocument();
    expect(screen.queryByTestId('new-yard-form')).not.toBeInTheDocument();
    expect(state.list).not.toHaveBeenCalled();
  });

  it('shows the form and unclaimed yards to operators', async () => {
    state.operator = { data: true, isLoading: false };
    state.list.mockResolvedValue([
      {
        id: 'org-1',
        name: 'Acme Heavy',
        provisioned_at: '2026-10-14',
        provisioned_by: 'op',
        pending_staff: 3,
        equipment_count: 12,
      },
    ]);
    renderPage();
    expect(screen.getByTestId('new-yard-form')).toBeInTheDocument();
    expect(await screen.findByText('Acme Heavy')).toBeInTheDocument();
    expect(screen.getByText('3 staff · 12 equipment')).toBeInTheDocument();
  });
});
