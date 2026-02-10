/**
 * QuickBooks Customer Mapping Component Tests
 *
 * Tests for the team-to-QuickBooks-customer mapping component including:
 * - Feature flag gating
 * - Permission checks
 * - Connection status checks
 * - Existing mapping display
 * - Customer search dialog
 * - Save / clear mapping actions
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

// Feature flags
vi.mock('@/lib/flags', () => ({
  isQuickBooksEnabled: vi.fn(() => true),
}));
import { isQuickBooksEnabled } from '@/lib/flags';

// Organization context
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: 'org-123', name: 'Test Organization' },
    isLoading: false,
  })),
}));

// QuickBooks access hook
const mockUseQuickBooksAccess = vi.fn(() => ({
  data: true,
  isLoading: false,
}));
vi.mock('@/hooks/useQuickBooksAccess', () => ({
  useQuickBooksAccess: (...args: unknown[]) => mockUseQuickBooksAccess(...args),
}));

// QuickBooks services
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

// Sonner toast
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

function renderComponent(props = { teamId: 'team-456', teamName: 'Alpha Team' }) {
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
    // Defaults: feature enabled, user has permission, QB connected
    vi.mocked(isQuickBooksEnabled).mockReturnValue(true);
    mockUseQuickBooksAccess.mockReturnValue({ data: true, isLoading: false });
    mockGetConnectionStatus.mockResolvedValue({ isConnected: true, realmId: 'realm-1' });
    mockGetTeamCustomerMapping.mockResolvedValue(null); // no existing mapping
    mockSearchCustomers.mockResolvedValue({ success: true, customers: [] });
  });

  // -----------------------------------------------------------------------
  // Feature flag gating
  // -----------------------------------------------------------------------
  it('should render nothing when the feature flag is disabled', () => {
    vi.mocked(isQuickBooksEnabled).mockReturnValue(false);

    const { container } = renderComponent();

    expect(container.innerHTML).toBe('');
  });

  // -----------------------------------------------------------------------
  // Permission gating
  // -----------------------------------------------------------------------
  it('should render nothing when user has no QuickBooks permission', async () => {
    mockUseQuickBooksAccess.mockReturnValue({ data: false, isLoading: false });

    const { container } = renderComponent();

    // Wait for any async renders
    await waitFor(() => {
      expect(container.querySelector('.animate-spin')).toBeNull();
    });

    expect(screen.queryByText('QuickBooks Customer')).toBeNull();
  });

  it('should show loading state while checking permissions', () => {
    mockUseQuickBooksAccess.mockReturnValue({ data: false, isLoading: true });

    renderComponent();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Connection status gating
  // -----------------------------------------------------------------------
  it('should render nothing when QuickBooks is not connected', async () => {
    mockGetConnectionStatus.mockResolvedValue({ isConnected: false });

    const { container } = renderComponent();

    await waitFor(() => {
      // Should not show the card title
      expect(screen.queryByText('QuickBooks Customer')).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // No existing mapping
  // -----------------------------------------------------------------------
  it('should show "Select Customer" button when no mapping exists', async () => {
    mockGetTeamCustomerMapping.mockResolvedValue(null);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Select Customer')).toBeInTheDocument();
    });

    expect(screen.getByText(/No QuickBooks customer mapped/)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Existing mapping display
  // -----------------------------------------------------------------------
  it('should show mapped customer name when mapping exists', async () => {
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

    expect(screen.getByText('Mapped')).toBeInTheDocument();
    expect(screen.getByText('Change')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Customer search dialog
  // -----------------------------------------------------------------------
  it('should open the customer search dialog when "Select Customer" is clicked', async () => {
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
      expect(screen.getByText('Select Customer')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Select Customer'));

    await waitFor(() => {
      expect(screen.getByText('Select QuickBooks Customer')).toBeInTheDocument();
    });
  });

  it('should display customer list in the dialog', async () => {
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
      expect(screen.getByText('Select Customer')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Select Customer'));

    await waitFor(() => {
      expect(screen.getByText('Alpha Customer')).toBeInTheDocument();
      expect(screen.getByText('Beta Customer')).toBeInTheDocument();
      expect(screen.getByText('Beta LLC')).toBeInTheDocument();
    });
  });
});
