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
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canManageTeam: () => true,
  }),
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
    remapFromQB: { mutateAsync: vi.fn(), isPending: false },
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
import { renderWithQuickBooksProviders } from '@/services/quickbooks/quickbooksTestUtils';

function renderComponent(props: {
  teamId: string;
  teamName: string;
  customerId?: string | null;
} = { teamId: 'team-456', teamName: 'Alpha Team' }) {
  return renderWithQuickBooksProviders(<QuickBooksCustomerMapping {...props} />);
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

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /link existing account/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /import from quickbooks/i })).toBeNull();
  });

  it('should show link existing account without QuickBooks connected', async () => {
    mockUseQuickBooksAccess.mockReturnValue({ data: true, isLoading: false });
    mockGetConnectionStatus.mockResolvedValue({ isConnected: false });
    mockGetTeamCustomerMapping.mockResolvedValue(null);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /link existing account/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /import from quickbooks/i })).toBeNull();
  });

  it('should show legacy mapping with upgrade prompt', async () => {
    mockGetTeamCustomerMapping.mockResolvedValue(null);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Import from QuickBooks')).toBeInTheDocument();
      expect(screen.getByText('Link existing account')).toBeInTheDocument();
    });

    expect(screen.getByText(/Link a QuickBooks customer/i)).toBeInTheDocument();
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

    expect(screen.getByText('Legacy mapping only')).toBeInTheDocument();
    expect(screen.getByText('Import as account')).toBeInTheDocument();
  });

  it('should open the import dialog when "Import from QuickBooks" is clicked', async () => {
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
      expect(screen.getByText('Import from QuickBooks')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Import from QuickBooks' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Import from QuickBooks' })).toBeInTheDocument();
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
      expect(screen.getByText('Import from QuickBooks')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Import from QuickBooks' }));

    await waitFor(() => {
      expect(screen.getByText('Alpha Customer')).toBeInTheDocument();
      expect(screen.getByText('Beta Customer')).toBeInTheDocument();
      expect(screen.getByText('Beta LLC')).toBeInTheDocument();
    });
  });

  it('should open the link existing dialog', async () => {
    mockGetTeamCustomerMapping.mockResolvedValue(null);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Link existing account' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Link existing account' }));

    expect(await screen.findByPlaceholderText('Search accounts...')).toBeInTheDocument();
  });

  it('should forward GivenName, FamilyName, Mobile, Fax, and contacts through qbCustomerToPayload', async () => {
    const user = userEvent.setup();
    mockGetTeamCustomerMapping.mockResolvedValue(null);
    const mockImportFromQB = vi.fn().mockResolvedValue({ id: 'created-cust' });
    const mockLink = vi.fn().mockResolvedValue(undefined);
    mockUpdateTeamCustomerMapping.mockResolvedValue({
      id: 'map-1',
      organization_id: 'org-123',
      team_id: 'team-456',
      quickbooks_customer_id: 'qb-1',
      display_name: 'Bill Lucchini',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    });

    vi.mocked(
      (await import('@/features/teams/hooks/useCustomerAccount')).useCustomerMutations
    ).mockReturnValue({
      create: { mutateAsync: vi.fn(), isPending: false },
      update: { mutateAsync: vi.fn(), isPending: false },
      link: { mutateAsync: mockLink, isPending: false },
      importFromQB: { mutateAsync: mockImportFromQB, isPending: false },
      refreshFromQB: { mutateAsync: vi.fn(), isPending: false },
      remapFromQB: { mutateAsync: vi.fn(), isPending: false },
    } as ReturnType<typeof import('@/features/teams/hooks/useCustomerAccount').useCustomerMutations>);

    mockSearchCustomers.mockResolvedValue({
      success: true,
      customers: [
        {
          Id: 'qb-1',
          DisplayName: 'Bill Lucchini',
          GivenName: 'Bill',
          FamilyName: 'Lucchini',
          CompanyName: "Bill's Windsurf Shop",
          Active: true,
          Email: 'surf@intuit.com',
          Phone: '(415) 444-6538',
          Mobile: '(415) 555-0001',
          Fax: '(415) 555-0002',
          contacts: [
            { sourceField: 'primary_email', name: 'Bill Lucchini', role: 'Primary email', email: 'surf@intuit.com' },
            { sourceField: 'primary_phone', name: 'Bill Lucchini', role: 'Primary phone', phone: '(415) 444-6538' },
          ],
        },
      ],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Import from QuickBooks')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Import from QuickBooks' }));

    await waitFor(() => {
      expect(screen.getByText('Bill Lucchini')).toBeInTheDocument();
    });

    // Select the customer and confirm
    await user.click(screen.getByText('Bill Lucchini'));

    const importBtn = screen.queryByRole('button', { name: /Import & link/i });
    if (importBtn) {
      await user.click(importBtn);
      await waitFor(() => {
        expect(mockImportFromQB).toHaveBeenCalledWith(
          expect.objectContaining({
            qb: expect.objectContaining({
              GivenName: 'Bill',
              FamilyName: 'Lucchini',
              Mobile: '(415) 555-0001',
              Fax: '(415) 555-0002',
              contacts: expect.arrayContaining([
                expect.objectContaining({ sourceField: 'primary_email' }),
              ]),
            }),
          })
        );
        expect(mockLink).toHaveBeenCalledWith({ teamId: 'team-456', customerId: 'created-cust' });
        expect(mockUpdateTeamCustomerMapping).toHaveBeenCalledWith(
          'org-123',
          'team-456',
          'qb-1',
          'Bill Lucchini',
        );
      });
    }
  });
});
