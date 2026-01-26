/**
 * QuickBooks Integration Component Tests
 * 
 * Tests for the QuickBooks OAuth connection UI component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock the feature flags
vi.mock('@/lib/flags', () => ({
  isQuickBooksEnabled: vi.fn(() => true),
  isQuickBooksDisabled: vi.fn(() => false),
  QUICKBOOKS_ENABLED: true,
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

// Mock the QuickBooks access hook (used for permission checking)
const mockUseQuickBooksAccess = vi.fn(() => ({
  data: true, // Has permission by default
  isLoading: false,
}));

vi.mock('@/hooks/useQuickBooksAccess', () => ({
  useQuickBooksAccess: () => mockUseQuickBooksAccess(),
}));

// Mock the QuickBooks service
const mockGetConnectionStatus = vi.fn();
const mockGenerateQuickBooksAuthUrl = vi.fn();
const mockDisconnectQuickBooks = vi.fn();
const mockIsQuickBooksConfigured = vi.fn();
const mockManualTokenRefresh = vi.fn();

vi.mock('@/services/quickbooks', () => ({
  getConnectionStatus: (...args: unknown[]) => mockGetConnectionStatus(...args),
  generateQuickBooksAuthUrl: (...args: unknown[]) => mockGenerateQuickBooksAuthUrl(...args),
  disconnectQuickBooks: (...args: unknown[]) => mockDisconnectQuickBooks(...args),
  isQuickBooksConfigured: () => mockIsQuickBooksConfigured(),
  manualTokenRefresh: (...args: unknown[]) => mockManualTokenRefresh(...args),
}));

import { QuickBooksIntegration } from '@/features/organization/components/QuickBooksIntegration';
import { isQuickBooksEnabled } from '@/lib/flags';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderComponent = (props = { currentUserRole: 'admin' as const }) => {
  const queryClient = createTestQueryClient();
  
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <QuickBooksIntegration {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('QuickBooksIntegration Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsQuickBooksConfigured.mockReturnValue(true);
    mockGetConnectionStatus.mockResolvedValue({
      isConnected: false,
    });
    // Reset permission mock to true (has access)
    mockUseQuickBooksAccess.mockReturnValue({
      data: true,
      isLoading: false,
    });
  });

  describe('Feature Flag', () => {
    it('should not render when feature is disabled', () => {
      vi.mocked(isQuickBooksEnabled).mockReturnValueOnce(false);
      
      const { container } = renderComponent();
      
      expect(container).toBeEmptyDOMElement();
    });

    it('should render when feature is enabled', async () => {
      vi.mocked(isQuickBooksEnabled).mockReturnValue(true);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('QuickBooks Online Integration')).toBeInTheDocument();
      });
    });
  });

  describe('Permission Checks', () => {
    it('should not render for users without can_manage_quickbooks permission', () => {
      // User does not have QuickBooks permission
      mockUseQuickBooksAccess.mockReturnValue({
        data: false,
        isLoading: false,
      });
      
      const { container } = renderComponent();
      
      expect(container).toBeEmptyDOMElement();
    });

    it('should render for users with can_manage_quickbooks permission (admin)', async () => {
      // Admin with QuickBooks permission
      mockUseQuickBooksAccess.mockReturnValue({
        data: true,
        isLoading: false,
      });
      
      renderComponent({ currentUserRole: 'admin' });
      
      await waitFor(() => {
        expect(screen.getByText('QuickBooks Online Integration')).toBeInTheDocument();
      });
    });

    it('should render for users with can_manage_quickbooks permission (owner)', async () => {
      // Owner always has QuickBooks permission
      mockUseQuickBooksAccess.mockReturnValue({
        data: true,
        isLoading: false,
      });
      
      renderComponent({ currentUserRole: 'owner' });
      
      await waitFor(() => {
        expect(screen.getByText('QuickBooks Online Integration')).toBeInTheDocument();
      });
    });
  });

  describe('Configuration Check', () => {
    it('should show configuration warning when not configured', async () => {
      mockIsQuickBooksConfigured.mockReturnValue(false);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText(/QuickBooks integration is not configured/i)).toBeInTheDocument();
      });
    });
  });

  describe('Not Connected State', () => {
    it('should show connect button when not connected', async () => {
      mockGetConnectionStatus.mockResolvedValue({
        isConnected: false,
      });
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Connect to QuickBooks Online/i })).toBeInTheDocument();
      });
    });

    it('should initiate OAuth flow on connect click', async () => {
      const mockAuthUrl = 'https://oauth.intuit.com/authorize?...';
      mockGenerateQuickBooksAuthUrl.mockResolvedValue(mockAuthUrl);
      
      // Mock window.location
      const locationSpy = vi.spyOn(window, 'location', 'get');
      const mockLocation = { href: '' };
      locationSpy.mockReturnValue(mockLocation as Location);
      
      mockGetConnectionStatus.mockResolvedValue({
        isConnected: false,
      });
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Connect to QuickBooks Online/i })).toBeInTheDocument();
      });
      
      const connectButton = screen.getByRole('button', { name: /Connect to QuickBooks Online/i });
      fireEvent.click(connectButton);
      
      await waitFor(() => {
        expect(mockGenerateQuickBooksAuthUrl).toHaveBeenCalled();
      });
      
      locationSpy.mockRestore();
    });
  });

  describe('Connected State', () => {
    beforeEach(() => {
      mockGetConnectionStatus.mockResolvedValue({
        isConnected: true,
        realmId: 'realm-123',
        connectedAt: new Date().toISOString(),
        isAccessTokenValid: true,
        isRefreshTokenValid: true,
      });
    });

    it('should show connected status when connected', async () => {
      renderComponent();
      
      await waitFor(() => {
        // Use getAllByText since there are multiple "Connected" texts (badge and date)
        const connectedTexts = screen.getAllByText(/Connected/i);
        expect(connectedTexts.length).toBeGreaterThan(0);
        // Check that the badge with "Connected" exists
        expect(connectedTexts[0]).toBeInTheDocument();
      });
    });

    it('should show disconnect button when connected', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Disconnect/i })).toBeInTheDocument();
      });
    });

    it('should show realm ID when connected', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText(/Company ID: realm-123/i)).toBeInTheDocument();
      });
    });
  });

  describe('Token Expiration', () => {
    it('should show reconnect button when refresh token is expired', async () => {
      mockGetConnectionStatus.mockResolvedValue({
        isConnected: true,
        realmId: 'realm-123',
        isAccessTokenValid: false,
        isRefreshTokenValid: false,
      });
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText(/authorization has expired/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Reconnect QuickBooks/i })).toBeInTheDocument();
      });
    });
  });

  // Note: OAuth callback handling tests are in Organization.test.tsx
  // since that functionality moved to the page level
});
