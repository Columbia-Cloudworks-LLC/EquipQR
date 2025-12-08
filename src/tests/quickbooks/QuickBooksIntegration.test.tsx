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

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useSearchParams
const mockSetSearchParams = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: vi.fn(() => [new URLSearchParams(), mockSetSearchParams]),
  };
});

import { QuickBooksIntegration } from '@/components/organization/QuickBooksIntegration';
import { isQuickBooksEnabled } from '@/lib/flags';
import { toast } from 'sonner';
import { useSearchParams as useSearchParamsMock } from 'react-router-dom';

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
    it('should not render for member role', () => {
      const { container } = renderComponent({ currentUserRole: 'member' as any });
      
      expect(container).toBeEmptyDOMElement();
    });

    it('should render for admin role', async () => {
      renderComponent({ currentUserRole: 'admin' });
      
      await waitFor(() => {
        expect(screen.getByText('QuickBooks Online Integration')).toBeInTheDocument();
      });
    });

    it('should render for owner role', async () => {
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
      locationSpy.mockReturnValue(mockLocation as any);
      
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
        expect(screen.getByText(/Connected/i)).toBeInTheDocument();
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

  describe('OAuth Callback Handling', () => {
    it('should show success toast on successful connection', async () => {
      const params = new URLSearchParams({ qb_connected: 'true' });
      vi.mocked(useSearchParamsMock).mockReturnValue([params, mockSetSearchParams]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('QuickBooks connected successfully!');
      });
    });

    it('should show error toast on OAuth error', async () => {
      const params = new URLSearchParams({ 
        error: 'access_denied',
        error_description: 'User denied access' 
      });
      vi.mocked(useSearchParamsMock).mockReturnValue([params, mockSetSearchParams]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('User denied access');
      });
    });
  });
});
