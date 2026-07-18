import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import CustomerContactActions from '@/features/teams/components/CustomerContactActions';

const mockUseExternalContacts = vi.fn();

vi.mock('@/features/teams/hooks/useCustomerAccount', () => ({
  useExternalContacts: (...args: unknown[]) => mockUseExternalContacts(...args),
}));

function createQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderComponent(customerId: string | null | undefined, compact = false) {
  return render(
    <QueryClientProvider client={createQC()}>
      <MemoryRouter>
        <CustomerContactActions customerId={customerId} compact={compact} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CustomerContactActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseExternalContacts.mockReturnValue({ data: [], isLoading: false });
  });

  it('returns null when no customerId', () => {
    const { container } = renderComponent(null);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when no QBO contacts', async () => {
    mockUseExternalContacts.mockReturnValue({ data: [], isLoading: false });
    const { container } = renderComponent('cust-1');
    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('renders mailto link for QBO contact with email', async () => {
    mockUseExternalContacts.mockReturnValue({
      data: [
        {
          id: 'c-1',
          customer_id: 'cust-1',
          name: 'Bill Lucchini',
          email: 'surf@intuit.com',
          phone: null,
          role: 'Primary email',
          source: 'quickbooks',
          source_field: 'primary_email',
          last_synced_at: null,
          source_payload: null,
        },
      ],
      isLoading: false,
    });

    renderComponent('cust-1');

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Email surf@intuit.com/i });
      expect(link).toHaveAttribute('href', 'mailto:surf@intuit.com');
    });
  });

  it('renders tel link for QBO contact with phone', async () => {
    mockUseExternalContacts.mockReturnValue({
      data: [
        {
          id: 'c-2',
          customer_id: 'cust-1',
          name: 'Bill Lucchini',
          email: null,
          phone: '(415) 444-6538',
          role: 'Primary phone',
          source: 'quickbooks',
          source_field: 'primary_phone',
          last_synced_at: null,
          source_payload: null,
        },
      ],
      isLoading: false,
    });

    renderComponent('cust-1');

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Call \(415\) 444-6538/i });
      expect(link).toHaveAttribute('href', 'tel:(415) 444-6538');
    });
  });

  it('does not render manual contacts', async () => {
    mockUseExternalContacts.mockReturnValue({
      data: [
        {
          id: 'c-3',
          customer_id: 'cust-1',
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: null,
          role: 'Site Manager',
          source: 'manual',
          source_field: null,
          last_synced_at: null,
          source_payload: null,
        },
      ],
      isLoading: false,
    });

    const { container } = renderComponent('cust-1');

    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });
});
