/**
 * QuickBooks Export Button Component Tests
 * 
 * Tests for the work order export button component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock the feature flags
vi.mock('@/lib/flags', () => ({
  isQuickBooksEnabled: vi.fn(() => true),
}));

// Mock the organization context
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: {
      id: 'org-123',
      name: 'Test Organization',
    },
    isLoading: false,
  })),
}));

// Mock the QuickBooks access hook (replaces usePermissions for QB access)
const mockUseQuickBooksAccess = vi.fn(() => ({
  data: true, // canExport = true by default
  isLoading: false,
}));

vi.mock('@/hooks/useQuickBooksAccess', () => ({
  useQuickBooksAccess: (...args: unknown[]) => mockUseQuickBooksAccess(...args),
}));

// Mock the QuickBooks service
const mockGetConnectionStatus = vi.fn();
const mockGetTeamCustomerMapping = vi.fn();

vi.mock('@/services/quickbooks', () => ({
  getConnectionStatus: (...args: unknown[]) => mockGetConnectionStatus(...args),
  getTeamCustomerMapping: (...args: unknown[]) => mockGetTeamCustomerMapping(...args),
}));

// Mock the export hook
const mockMutate = vi.fn();
const mockUseExportToQuickBooks = vi.fn(() => ({
  mutate: mockMutate,
  isPending: false,
  isLoading: false,
  isSuccess: false,
  isError: false,
  error: null,
  data: undefined,
}));
const mockUseQuickBooksLastExport = vi.fn(() => ({
  data: null,
}));
const mockUseQuickBooksExportLogs = vi.fn(() => ({
  data: [],
}));

vi.mock('@/hooks/useExportToQuickBooks', () => ({
  useExportToQuickBooks: (...args: unknown[]) => mockUseExportToQuickBooks(...args),
  useQuickBooksLastExport: (...args: unknown[]) => mockUseQuickBooksLastExport(...args),
  useQuickBooksExportLogs: (...args: unknown[]) => mockUseQuickBooksExportLogs(...args),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { QuickBooksExportButton } from '@/features/work-orders/components/QuickBooksExportButton';
import { isQuickBooksEnabled } from '@/lib/flags';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderComponent = (props = {
  workOrderId: 'wo-123',
  teamId: 'team-456',
  workOrderStatus: 'completed' as const,
  asMenuItem: false,
  showStatusDetails: false,
}) => {
  const queryClient = createTestQueryClient();
  
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <QuickBooksExportButton {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('QuickBooksExportButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isQuickBooksEnabled).mockReturnValue(true);
    // Mock QuickBooks access permission (replaces usePermissions for QB)
    mockUseQuickBooksAccess.mockReturnValue({
      data: true, // canExport = true
      isLoading: false,
    });
    mockGetConnectionStatus.mockResolvedValue({
      isConnected: true,
    });
    mockGetTeamCustomerMapping.mockResolvedValue({
      quickbooks_customer_id: 'qb-cust-123',
      display_name: 'Test Customer',
    });
    mockUseQuickBooksLastExport.mockReturnValue({
      data: null,
    });
    mockUseQuickBooksExportLogs.mockReturnValue({
      data: [],
    });
    mockUseExportToQuickBooks.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      data: undefined,
    });
  });

  describe('Feature Flag', () => {
    it('should not render when feature is disabled', () => {
      vi.mocked(isQuickBooksEnabled).mockReturnValue(false);
      
      const { container } = renderComponent();
      
      expect(container).toBeEmptyDOMElement();
    });

    it('should render when feature is enabled', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Export to QuickBooks/i })).toBeInTheDocument();
      });
    });
  });

  describe('Permission Checks', () => {
    it('should not render for users without QuickBooks access', () => {
      mockUseQuickBooksAccess.mockReturnValue({
        data: false, // canExport = false
        isLoading: false,
      });
      
      const { container } = renderComponent();
      
      expect(container).toBeEmptyDOMElement();
    });

    it('should render for users with QuickBooks access', async () => {
      mockUseQuickBooksAccess.mockReturnValue({
        data: true, // canExport = true
        isLoading: false,
      });
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Export to QuickBooks/i })).toBeInTheDocument();
      });
    });
  });

  describe('QuickBooks Not Connected', () => {
    it('should be disabled when QuickBooks is not connected', async () => {
      mockGetConnectionStatus.mockResolvedValue({
        isConnected: false,
      });
      
      renderComponent();
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Export to QuickBooks/i });
        expect(button).toBeDisabled();
      });
    });
  });

  describe('No Team Assigned to Equipment', () => {
    it('should be disabled when equipment has no team assigned', async () => {
      renderComponent({
        workOrderId: 'wo-123',
        teamId: null,
        workOrderStatus: 'completed',
        asMenuItem: false,
      });
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Export to QuickBooks/i });
        expect(button).toBeDisabled();
      });
    });
  });

  describe('No Customer Mapping', () => {
    it('should be disabled when team has no customer mapping', async () => {
      mockGetTeamCustomerMapping.mockResolvedValue(null);
      
      renderComponent();
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Export to QuickBooks/i });
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Work Order Status Gating', () => {
    it('should be disabled when work order status is not completed', async () => {
      renderComponent({
        workOrderId: 'wo-123',
        teamId: 'team-456',
        workOrderStatus: 'in_progress',
        asMenuItem: false,
      });
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Export to QuickBooks/i });
        expect(button).toBeDisabled();
      });
    });

    it('should be enabled when work order status is completed', async () => {
      renderComponent({
        workOrderId: 'wo-123',
        teamId: 'team-456',
        workOrderStatus: 'completed',
        asMenuItem: false,
      });
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Export to QuickBooks/i });
        expect(button).not.toBeDisabled();
      });
    });

    it('should be disabled when export is in progress (isPending)', async () => {
      mockUseExportToQuickBooks.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
        data: undefined,
      });
      
      renderComponent();
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Export to QuickBooks/i });
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Ready to Export', () => {
    it('should be enabled when all conditions are met', async () => {
      renderComponent();
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Export to QuickBooks/i });
        expect(button).not.toBeDisabled();
      });
    });

    it('should call mutate on click', async () => {
      renderComponent();
      
      // Wait for button to be enabled (queries resolved)
      const button = await waitFor(() => {
        const btn = screen.getByRole('button', { name: /Export to QuickBooks/i });
        expect(btn).not.toBeDisabled();
        return btn;
      });
      
      fireEvent.click(button);
      
      // Wait for the mutation to be called with correct parameters
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith('wo-123', expect.objectContaining({
          onSuccess: expect.any(Function),
        }));
      }, { timeout: 3000 });
    });
  });

  describe('Already Exported', () => {
    beforeEach(() => {
      mockUseQuickBooksLastExport.mockReturnValue({
        data: {
          quickbooks_invoice_id: 'inv-123',
          quickbooks_invoice_number: '1001',
          quickbooks_environment: 'sandbox',
        },
      });
    });

    it('should show update button with invoice number when already exported', async () => {
      renderComponent();
      
      await waitFor(() => {
        // Button text is now "Update Invoice {invoiceNumber}"
        expect(screen.getByRole('button', { name: /Update Invoice 1001/i })).toBeInTheDocument();
      });
    });

    it('should call mutate when updating existing export', async () => {
      renderComponent();
      
      const button = await waitFor(() => {
        const foundButton = screen.getByRole('button', { name: /Update Invoice 1001/i });
        expect(foundButton).not.toBeDisabled();
        return foundButton;
      });

      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith('wo-123', expect.objectContaining({
          onSuccess: expect.any(Function),
        }));
      });
    });

    it('should show external link to view invoice in QuickBooks', async () => {
      renderComponent();
      
      await waitFor(() => {
        // Should have external link button
        expect(screen.getByRole('button', { name: /View invoice in QuickBooks/i })).toBeInTheDocument();
      });
    });
  });

  describe('Status Details Popover', () => {
    it('should show status details when enabled', async () => {
      mockUseQuickBooksExportLogs.mockReturnValue({
        data: [
          {
            id: 'log-1',
            organization_id: 'org-123',
            work_order_id: 'wo-123',
            realm_id: 'realm-1',
            quickbooks_invoice_id: 'inv-123',
            quickbooks_invoice_number: '1001',
            quickbooks_environment: 'sandbox',
            status: 'error',
            error_message: 'Something went wrong',
            exported_at: '2024-01-01T10:00:00.000Z',
            created_at: '2024-01-01T09:00:00.000Z',
            updated_at: '2024-01-01T10:00:00.000Z',
            intuit_tid: 'tid-123',
            pdf_attachment_status: 'failed',
            pdf_attachment_error: 'PDF failed',
            pdf_attachment_intuit_tid: 'tid-pdf-456',
          },
        ],
      });

      renderComponent({
        workOrderId: 'wo-123',
        teamId: 'team-456',
        workOrderStatus: 'completed',
        asMenuItem: false,
        showStatusDetails: true,
      });

      const statusButton = await waitFor(() => {
        const button = screen.getByRole('button', { name: /QuickBooks export status/i });
        expect(button).toBeInTheDocument();
        return button;
      });

      fireEvent.click(statusButton);

      await waitFor(() => {
        expect(screen.getByText(/Last export/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Error/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/PDF attachment/i)).toBeInTheDocument();
        expect(screen.getByText(/Open in QuickBooks/i)).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /Copy/i })).toHaveLength(2);
      });
    });

    it('should show pending status badge for pending exports', async () => {
      mockUseQuickBooksExportLogs.mockReturnValue({
        data: [
          {
            id: 'log-2',
            organization_id: 'org-123',
            work_order_id: 'wo-123',
            realm_id: 'realm-1',
            quickbooks_invoice_id: null,
            quickbooks_invoice_number: null,
            quickbooks_environment: null,
            status: 'pending',
            error_message: null,
            exported_at: null,
            created_at: '2024-01-02T09:00:00.000Z',
            updated_at: '2024-01-02T09:00:00.000Z',
            intuit_tid: null,
            pdf_attachment_status: 'disabled',
            pdf_attachment_error: null,
            pdf_attachment_intuit_tid: null,
          },
        ],
      });

      renderComponent({
        workOrderId: 'wo-123',
        teamId: 'team-456',
        workOrderStatus: 'completed',
        asMenuItem: false,
        showStatusDetails: true,
      });

      const statusButton = await waitFor(() => {
        const button = screen.getByRole('button', { name: /QuickBooks export status/i });
        expect(button).toBeInTheDocument();
        return button;
      });

      fireEvent.click(statusButton);

      await waitFor(() => {
        expect(screen.getAllByText(/Pending/i).length).toBeGreaterThan(0);
      });
    });
  });
});
