/**
 * QuickBooks Customer Mapping Component Tests
 *
 * Tests for the team-to-QuickBooks-customer mapping component including:
 * - Feature flag gating
 * - Permission checks
 * - Connection status checks
 * - Existing mapping display (linked account, legacy mapping, no mapping)
 * - Import and Link dialogs
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/flags', () => ({
  isQuickBooksEnabled: vi.fn(() => true),
}));
import { isQuickBooksEnabled } from '@/lib/flags';

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: 'org-123', name: 'Test Organization' },
    isLoading: false,
  })),
}));

const mockUseQuickBooksAccess = vi.fn(() => ({
  data: true,
  isLoading: false,
}));
vi.mock('@/hooks/useQuickBooksAccess', () => ({
  useQuickBooksAccess: (...args: unknown[]) => mockUseQuickBooksAccess(...args),
}));

const mockGetConnectionStatus = vi.fn();
const mockGetTeamCustomerMapping = vi.fn();
const mockUpdateTeamCustomerMapping = vi.fn();
const mockClearTeamCustomerMapping = vi.fn();
const mockSearchCustomers = vi.fn();

vi.mock('@/services/quickbooks', () => ({
  getConnectionStatus: (...args: unknown[]) => mockGetConnectionStatus(...args),
  getTeamCustomerMapping: (...args: unknown[]) => mockGetTeamCustomerMapping(...args),
  updateTeamCustomerMapping: (...args: unknown[]) => mockUpdateTeamCustomerMapping(...args),
  clearTeamCustomerMapping: (...args: unknown[]) => mockClearTeamCustomerMapping(...args),
  searchCustomers: (...args: unknown[]) => mockSearchCustomers(...args),
}));

vi.mock('@/features/teams/hooks/useCustomerAccount', () => ({
  useCustomer: vi.fn(() => ({ data: null, isLoading: false })),
  useCustomersByOrg: vi.fn(() => ({ data: [], isLoading: false })),
  useCustomerMutations: vi.fn(() => ({
    create: { mutateAsync: vi.fn(), isPending: false },
    update: { mutateAsync: vi.fn(), isPending: false },
    link: { mutateAsync: vi.fn(), isPending: false },
    importFromQB: { mutateAsync: vi.fn(), isPending: false },
    refreshFromQB: { mutateAsync: vi.fn(), isPending: false },
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { QuickBooksCustomerMapping } from '@/features/teams/components/QuickBooksCustomerMapping';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderComponent(props: {
  teamId: string;
  teamName: string;
  customerId?: string | null;
} = { teamId: 'team-456', teamName: 'Alpha Team' }) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <QuickBooksCustomerMapping {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QuickBooksCustomerMapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isQuickBooksEnabled).mockReturnValue(true);
    mockUseQuickBooksAccess.mockReturnValue({ data: true, isLoading: false });
    mockGetConnectionStatus.mockResolvedValue({ isConnected: true, realmId: 'realm-1' });
    mockGetTeamCustomerMapping.mockResolvedValue(null);
    mockSearchCustomers.mockResolvedValue({ success: true, customers: [] });
  });

  it('should render nothing when the feature flag is disabled', () => {
    vi.mocked(isQuickBooksEnabled).mockReturnValue(false);

    const { container } = renderComponent();
    expect(container.innerHTML).toBe('');
  });

  it('should render nothing when user has no QuickBooks permission', async () => {
    mockUseQuickBooksAccess.mockReturnValue({ data: false, isLoading: false });

    const { container } = renderComponent();

    await waitFor(() => {
      expect(container.querySelector('.animate-spin')).toBeNull();
    });
    expect(screen.queryByText('QuickBooks Customer')).toBeNull();
  });

  it('should render nothing when QuickBooks is not connected', async () => {
    mockGetConnectionStatus.mockResolvedValue({ isConnected: false });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('QuickBooks Customer')).toBeNull();
    });
  });

  it('should show "Import from QB" and "Link Existing" buttons when no mapping exists', async () => {
    mockGetTeamCustomerMapping.mockResolvedValue(null);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Import from QB')).toBeInTheDocument();
      expect(screen.getByText('Link Existing')).toBeInTheDocument();
    });

    expect(screen.getByText(/No customer account linked/)).toBeInTheDocument();
  });

  it('should show legacy mapping with upgrade prompt', async () => {
    mockGetTeamCustomerMapping.mockResolvedValue({
      id: 'map-1',
      organization_id: 'org-123',
      team_id: 'team-456',
      quickbooks_customer_id: 'cust-1',
      display_name: 'Acme Corp',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    expect(screen.getByText('Legacy Mapping')).toBeInTheDocument();
    expect(screen.getByText('Import as Account')).toBeInTheDocument();
  });

  it('should open the import dialog when "Import from QB" is clicked', async () => {
    const user = userEvent.setup();
    mockGetTeamCustomerMapping.mockResolvedValue(null);
    mockSearchCustomers.mockResolvedValue({
      success: true,
      customers: [
        { Id: 'c-1', DisplayName: 'Customer One', Active: true },
        { Id: 'c-2', DisplayName: 'Customer Two', CompanyName: 'Two Inc', Active: true },
      ],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Import from QB')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Import from QB'));

    await waitFor(() => {
      expect(screen.getByText('Import from QuickBooks')).toBeInTheDocument();
    });
  });

  it('should display customer list in the import dialog', async () => {
    const user = userEvent.setup();
    mockGetTeamCustomerMapping.mockResolvedValue(null);
    mockSearchCustomers.mockResolvedValue({
      success: true,
      customers: [
        { Id: 'c-1', DisplayName: 'Alpha Customer', Active: true },
        { Id: 'c-2', DisplayName: 'Beta Customer', CompanyName: 'Beta LLC', Active: true },
      ],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Import from QB')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Import from QB'));

    await waitFor(() => {
      expect(screen.getByText('Alpha Customer')).toBeInTheDocument();
      expect(screen.getByText('Beta Customer')).toBeInTheDocument();
      expect(screen.getByText('Beta LLC')).toBeInTheDocument();
    });
  });

  it('should open the link existing dialog', async () => {
    const user = userEvent.setup();
    mockGetTeamCustomerMapping.mockResolvedValue(null);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Link Existing')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Link Existing'));

    await waitFor(() => {
      expect(screen.getByText('Link Existing Account')).toBeInTheDocument();
    });
  });
});
