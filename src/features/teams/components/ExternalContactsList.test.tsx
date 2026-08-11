import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ExternalContactsList from '@/features/teams/components/ExternalContactsList';

const mockUseExternalContacts = vi.fn();
const mockUseExternalContactMutations = vi.fn();

vi.mock('@/features/teams/hooks/useCustomerAccount', () => ({
  useExternalContacts: (...args: unknown[]) => mockUseExternalContacts(...args),
  useExternalContactMutations: (...args: unknown[]) => mockUseExternalContactMutations(...args),
}));

function createQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderComponent(
  organizationId = 'org-1',
  customerId = 'cust-1',
  canManage = true,
  teamMembers: Parameters<typeof ExternalContactsList>[0]['teamMembers'] = []
) {
  return render(
    <QueryClientProvider client={createQC()}>
      <MemoryRouter>
        <ExternalContactsList
          organizationId={organizationId}
          customerId={customerId}
          canManage={canManage}
          teamMembers={teamMembers}
        />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ExternalContactsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseExternalContactMutations.mockReturnValue({
      create: { mutateAsync: vi.fn(), isPending: false },
      update: { mutateAsync: vi.fn(), isPending: false },
      remove: { mutateAsync: vi.fn(), isPending: false },
    });
  });

  it('shows QuickBooks badge for QBO-sourced contacts', async () => {
    mockUseExternalContacts.mockReturnValue({
      data: [
        {
          id: 'c-1',
          customer_id: 'cust-1',
          name: 'Bill Lucchini',
          email: 'surf@intuit.com',
          phone: null,
          role: 'Primary email',
          notes: null,
          created_at: null,
          updated_at: null,
          source: 'quickbooks',
          source_external_id: 'qb-cust-1',
          source_field: 'primary_email',
          last_synced_at: '2026-05-16T00:00:00Z',
          source_payload: null,
        },
      ],
      isLoading: false,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('QuickBooks')).toBeInTheDocument();
    });
  });

  it('hides edit and delete buttons for QBO-sourced contacts even when canManage is true', async () => {
    mockUseExternalContacts.mockReturnValue({
      data: [
        {
          id: 'c-1',
          customer_id: 'cust-1',
          name: 'Bill Lucchini',
          email: 'surf@intuit.com',
          phone: null,
          role: 'Primary email',
          notes: null,
          created_at: null,
          updated_at: null,
          source: 'quickbooks',
          source_external_id: 'qb-cust-1',
          source_field: 'primary_email',
          last_synced_at: '2026-05-16T00:00:00Z',
          source_payload: null,
        },
      ],
      isLoading: false,
    });

    renderComponent('org-1', 'cust-1', true);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Edit Bill Lucchini/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Delete Bill Lucchini/i })).toBeNull();
    });
  });

  it('shows edit and delete buttons for manual contacts when canManage is true', async () => {
    mockUseExternalContacts.mockReturnValue({
      data: [
        {
          id: 'c-2',
          customer_id: 'cust-1',
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: null,
          role: 'Site Manager',
          notes: null,
          created_at: null,
          updated_at: null,
          source: 'manual',
          source_external_id: null,
          source_field: null,
          last_synced_at: null,
          source_payload: null,
        },
      ],
      isLoading: false,
    });

    renderComponent('org-1', 'cust-1', true);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Edit Jane Doe/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete Jane Doe/i })).toBeInTheDocument();
    });
  });

  it('hides edit and delete for manual rows that still carry QBO provenance metadata', async () => {
    mockUseExternalContacts.mockReturnValue({
      data: [
        {
          id: 'c-legacy',
          customer_id: 'cust-1',
          name: 'Legacy Contact',
          email: 'legacy@example.com',
          phone: null,
          role: 'Billing',
          notes: null,
          created_at: null,
          updated_at: null,
          source: 'manual',
          source_external_id: 'qb-stale',
          source_field: 'primary_email',
          last_synced_at: null,
          source_payload: null,
        },
      ],
      isLoading: false,
    });

    renderComponent('org-1', 'cust-1', true);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Edit Legacy Contact/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Delete Legacy Contact/i })).toBeNull();
    });
  });

  it('shows team manager and requestor as automatic contacts', async () => {
    mockUseExternalContacts.mockReturnValue({ data: [], isLoading: false });

    renderComponent('org-1', 'cust-1', false, [
      {
        id: 'tm-1',
        user_id: 'user-1',
        team_id: 'team-1',
        role: 'manager',
        joined_date: '2024-01-01T00:00:00Z',
        profiles: { name: 'Pat Manager', email: 'pat@example.com' },
      },
      {
        id: 'tm-2',
        user_id: 'user-2',
        team_id: 'team-1',
        role: 'requestor',
        joined_date: '2024-01-02T00:00:00Z',
        profiles: { name: 'Riley Requestor', email: 'riley@example.com' },
      },
    ]);

    await waitFor(() => {
      expect(screen.getByText('Pat Manager')).toBeInTheDocument();
      expect(screen.getByText('Riley Requestor')).toBeInTheDocument();
      expect(screen.getByText('Team Manager')).toBeInTheDocument();
      expect(screen.getByText('Requestor')).toBeInTheDocument();
      expect(screen.getAllByText('EquipQR user')).toHaveLength(2);
    });
  });

  it('renders email as mailto link for QBO contacts', async () => {
    mockUseExternalContacts.mockReturnValue({
      data: [
        {
          id: 'c-1',
          customer_id: 'cust-1',
          name: 'Bill Lucchini',
          email: 'surf@intuit.com',
          phone: null,
          role: 'Primary email',
          notes: null,
          created_at: null,
          updated_at: null,
          source: 'quickbooks',
          source_external_id: 'qb-cust-1',
          source_field: 'primary_email',
          last_synced_at: null,
          source_payload: null,
        },
      ],
      isLoading: false,
    });

    renderComponent();

    await waitFor(() => {
      const link = screen.getByText('surf@intuit.com');
      expect(link.closest('a')).toHaveAttribute('href', 'mailto:surf@intuit.com');
    });
  });
});
