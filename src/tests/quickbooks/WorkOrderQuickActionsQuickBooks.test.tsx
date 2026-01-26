/**
 * WorkOrderQuickActions QuickBooks Permission Tests
 * 
 * Tests that verify QuickBooks menu item visibility is gated by can_manage_quickbooks permission.
 * Uses rendering tests to verify the component actually renders the menu item based on hooks.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

// Mock the feature flags
const mockIsQuickBooksEnabled = vi.fn(() => true);
vi.mock('@/lib/flags', () => ({
  isQuickBooksEnabled: (...args: unknown[]) => mockIsQuickBooksEnabled(...args),
}));

// Mock the QuickBooks access hook
const mockUseQuickBooksAccess = vi.fn(() => ({
  data: false, // Default to no permission
  isLoading: false,
}));

vi.mock('@/hooks/useQuickBooksAccess', () => ({
  useQuickBooksAccess: (...args: unknown[]) => mockUseQuickBooksAccess(...args),
}));

// Mock QuickBooksExportButton to simplify the test
vi.mock('@/features/work-orders/components/QuickBooksExportButton', () => ({
  QuickBooksExportButton: ({ workOrderId }: { workOrderId: string }) => (
    <div data-testid="quickbooks-export-button">QuickBooks Export ({workOrderId})</div>
  ),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { WorkOrderQuickActions } from '@/features/work-orders/components/WorkOrderQuickActions';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderComponent = (props = {
  workOrderId: 'wo-123',
  workOrderStatus: 'completed' as const,
  equipmentTeamId: 'team-456',
}) => {
  const queryClient = createTestQueryClient();
  
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <WorkOrderQuickActions {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('WorkOrderQuickActions QuickBooks Menu Item Visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsQuickBooksEnabled.mockReturnValue(true);
    mockUseQuickBooksAccess.mockReturnValue({
      data: false,
      isLoading: false,
    });
  });

  describe('Feature Flag', () => {
    it('should not show QuickBooks menu item when feature flag is disabled', async () => {
      mockIsQuickBooksEnabled.mockReturnValue(false);
      mockUseQuickBooksAccess.mockReturnValue({
        data: true, // Has permission but feature disabled
        isLoading: false,
      });

      renderComponent();
      
      const trigger = screen.getByLabelText('Quick actions');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.queryByTestId('quickbooks-export-button')).not.toBeInTheDocument();
      });
    });

    it('should show QuickBooks menu item when feature flag is enabled and user has permission', async () => {
      mockIsQuickBooksEnabled.mockReturnValue(true);
      mockUseQuickBooksAccess.mockReturnValue({
        data: true,
        isLoading: false,
      });

      renderComponent();
      
      const trigger = screen.getByLabelText('Quick actions');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('quickbooks-export-button')).toBeInTheDocument();
      });
    });
  });

  describe('Permission Gating', () => {
    it('should show QuickBooks menu item for users with can_manage_quickbooks permission', async () => {
      mockUseQuickBooksAccess.mockReturnValue({
        data: true,
        isLoading: false,
      });

      renderComponent();
      
      const trigger = screen.getByLabelText('Quick actions');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('quickbooks-export-button')).toBeInTheDocument();
      });
    });

    it('should not show QuickBooks menu item for users without can_manage_quickbooks permission', async () => {
      mockUseQuickBooksAccess.mockReturnValue({
        data: false,
        isLoading: false,
      });

      renderComponent();
      
      const trigger = screen.getByLabelText('Quick actions');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.queryByTestId('quickbooks-export-button')).not.toBeInTheDocument();
      });
    });
  });

  describe('Permission Scenarios', () => {
    it('should show QuickBooks menu item for owner (always has permission)', async () => {
      mockUseQuickBooksAccess.mockReturnValue({
        data: true, // Owners always have can_manage_quickbooks = true per RPC logic
        isLoading: false,
      });

      renderComponent();
      
      const trigger = screen.getByLabelText('Quick actions');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('quickbooks-export-button')).toBeInTheDocument();
      });
    });

    it('should show QuickBooks menu item for admin with can_manage_quickbooks=true', async () => {
      mockUseQuickBooksAccess.mockReturnValue({
        data: true,
        isLoading: false,
      });

      renderComponent();
      
      const trigger = screen.getByLabelText('Quick actions');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('quickbooks-export-button')).toBeInTheDocument();
      });
    });

    it('should not show QuickBooks menu item for admin with can_manage_quickbooks=false', async () => {
      mockUseQuickBooksAccess.mockReturnValue({
        data: false,
        isLoading: false,
      });

      renderComponent();
      
      const trigger = screen.getByLabelText('Quick actions');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.queryByTestId('quickbooks-export-button')).not.toBeInTheDocument();
      });
    });

    it('should not show QuickBooks menu item for regular member', async () => {
      // Members can never have can_manage_quickbooks permission per RPC logic
      mockUseQuickBooksAccess.mockReturnValue({
        data: false,
        isLoading: false,
      });

      renderComponent();
      
      const trigger = screen.getByLabelText('Quick actions');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.queryByTestId('quickbooks-export-button')).not.toBeInTheDocument();
      });
    });
  });

  describe('Combined Conditions', () => {
    it('should not show QuickBooks menu item when feature disabled even with permission', async () => {
      mockIsQuickBooksEnabled.mockReturnValue(false);
      mockUseQuickBooksAccess.mockReturnValue({
        data: true,
        isLoading: false,
      });

      renderComponent();
      
      const trigger = screen.getByLabelText('Quick actions');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.queryByTestId('quickbooks-export-button')).not.toBeInTheDocument();
      });
    });

    it('should not show QuickBooks menu item when no permission even with feature enabled', async () => {
      mockUseQuickBooksAccess.mockReturnValue({
        data: false,
        isLoading: false,
      });

      renderComponent();
      
      const trigger = screen.getByLabelText('Quick actions');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.queryByTestId('quickbooks-export-button')).not.toBeInTheDocument();
      });
    });

    it('should show QuickBooks menu item only when both feature enabled AND has permission', async () => {
      mockIsQuickBooksEnabled.mockReturnValue(true);
      mockUseQuickBooksAccess.mockReturnValue({
        data: true,
        isLoading: false,
      });

      renderComponent();
      
      const trigger = screen.getByLabelText('Quick actions');
      await userEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('quickbooks-export-button')).toBeInTheDocument();
      });
    });
  });
});
