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
const mockGetLastSuccessfulExport = vi.fn();

vi.mock('@/services/quickbooks', () => ({
  getConnectionStatus: (...args: unknown[]) => mockGetConnectionStatus(...args),
  getTeamCustomerMapping: (...args: unknown[]) => mockGetTeamCustomerMapping(...args),
  getLastSuccessfulExport: (...args: unknown[]) => mockGetLastSuccessfulExport(...args),
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

vi.mock('@/hooks/useExportToQuickBooks', () => ({
  useExportToQuickBooks: (...args: unknown[]) => mockUseExportToQuickBooks(...args),
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
import { usePermissions } from '@/hooks/usePermissions';

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
    } as ReturnType<typeof usePermissions>);
    mockGetConnectionStatus.mockResolvedValue({
      isConnected: true,
    });
    mockGetTeamCustomerMapping.mockResolvedValue({
      quickbooks_customer_id: 'qb-cust-123',
      display_name: 'Test Customer',
    });
    mockGetLastSuccessfulExport.mockResolvedValue(null);
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
    it('should not render for non-admin users', () => {
      vi.mocked(usePermissions).mockReturnValue({
        hasRole: () => false,
      } as ReturnType<typeof usePermissions>);
      
      const { container } = renderComponent();
      
      expect(container).toBeEmptyDOMElement();
    });

    it('should render for admin users', async () => {
      vi.mocked(usePermissions).mockReturnValue({
        hasRole: (roles: string[]) => roles.includes('admin'),
        canManageTeam: () => true,
        canViewTeam: () => true,
        canCreateTeam: () => true,
        canManageEquipment: () => true,
        canViewEquipment: () => true,
        canCreateEquipment: () => true,
        canManageWorkOrder: () => true,
        canViewWorkOrder: () => true,
        canCreateWorkOrder: () => true,
        canManageInventory: () => true,
        canViewInventory: () => true,
        canCreateInventory: () => true,
        canManageOrganization: () => true,
        canViewOrganization: () => true,
        canManagePMTemplates: () => true,
        canViewPMTemplates: () => true,
        canCreatePMTemplates: () => true
      } as ReturnType<typeof usePermissions>);
      
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

    it('should call mutate when updating existing export', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Update QuickBooks Invoice/i })).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button', { name: /Update QuickBooks Invoice/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith('wo-123', expect.objectContaining({
          onSuccess: expect.any(Function),
        }));
      });
    });
  });
});
