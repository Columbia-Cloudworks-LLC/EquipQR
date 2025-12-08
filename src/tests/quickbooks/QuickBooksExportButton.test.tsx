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

// Mock the permissions hook
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    hasRole: vi.fn((roles: string[]) => roles.includes('admin')),
  })),
}));

// Mock the QuickBooks service
const mockGetConnectionStatus = vi.fn();
const mockGetTeamCustomerMapping = vi.fn();
const mockExportInvoice = vi.fn();
const mockGetLastSuccessfulExport = vi.fn();

vi.mock('@/services/quickbooks', () => ({
  getConnectionStatus: (...args: unknown[]) => mockGetConnectionStatus(...args),
  getTeamCustomerMapping: (...args: unknown[]) => mockGetTeamCustomerMapping(...args),
  exportInvoice: (...args: unknown[]) => mockExportInvoice(...args),
  getLastSuccessfulExport: (...args: unknown[]) => mockGetLastSuccessfulExport(...args),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { QuickBooksExportButton } from '@/components/work-orders/QuickBooksExportButton';
import { isQuickBooksEnabled } from '@/lib/flags';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';

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
  asMenuItem: false,
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
    vi.mocked(usePermissions).mockReturnValue({
      hasRole: (roles: string[]) => roles.includes('admin'),
    } as any);
    mockGetConnectionStatus.mockResolvedValue({
      isConnected: true,
    });
    mockGetTeamCustomerMapping.mockResolvedValue({
      quickbooks_customer_id: 'qb-cust-123',
      display_name: 'Test Customer',
    });
    mockGetLastSuccessfulExport.mockResolvedValue(null);
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
    it('should not render for non-admin users', () => {
      vi.mocked(usePermissions).mockReturnValue({
        hasRole: () => false,
      } as any);
      
      const { container } = renderComponent();
      
      expect(container).toBeEmptyDOMElement();
    });

    it('should render for admin users', async () => {
      vi.mocked(usePermissions).mockReturnValue({
        hasRole: (roles: string[]) => roles.includes('admin'),
      } as any);
      
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

  describe('No Team Assigned', () => {
    it('should be disabled when work order has no team', async () => {
      renderComponent({
        workOrderId: 'wo-123',
        teamId: null,
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

  describe('Ready to Export', () => {
    it('should be enabled when all conditions are met', async () => {
      renderComponent();
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Export to QuickBooks/i });
        expect(button).not.toBeDisabled();
      });
    });

    it('should call exportInvoice on click', async () => {
      mockExportInvoice.mockResolvedValue({
        success: true,
        invoiceNumber: '1001',
        isUpdate: false,
      });
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Export to QuickBooks/i })).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button', { name: /Export to QuickBooks/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockExportInvoice).toHaveBeenCalledWith('wo-123');
      });
    });

    it('should show success toast on successful export', async () => {
      mockExportInvoice.mockResolvedValue({
        success: true,
        invoiceNumber: '1001',
        isUpdate: false,
      });
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Export to QuickBooks/i })).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button', { name: /Export to QuickBooks/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Invoice 1001 created in QuickBooks');
      });
    });
  });

  describe('Already Exported', () => {
    beforeEach(() => {
      mockGetLastSuccessfulExport.mockResolvedValue({
        quickbooks_invoice_id: 'inv-123',
      });
    });

    it('should show update button when already exported', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Update QuickBooks Invoice/i })).toBeInTheDocument();
      });
    });

    it('should show update toast on successful update', async () => {
      mockExportInvoice.mockResolvedValue({
        success: true,
        invoiceNumber: '1001',
        isUpdate: true,
      });
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Update QuickBooks Invoice/i })).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button', { name: /Update QuickBooks Invoice/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Invoice 1001 updated in QuickBooks');
      });
    });
  });

  describe('Export Error', () => {
    it('should show error toast on failed export', async () => {
      mockExportInvoice.mockResolvedValue({
        success: false,
        error: 'QuickBooks API error',
      });
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Export to QuickBooks/i })).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button', { name: /Export to QuickBooks/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('QuickBooks API error');
      });
    });
  });
});
