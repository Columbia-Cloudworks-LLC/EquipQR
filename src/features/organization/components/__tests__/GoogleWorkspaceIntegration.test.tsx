import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { customRender } from '@/test/utils/renderUtils';

// Hoisted mocks
const { mockGenerateAuthUrl, mockSyncUsers, mockGetConnectionStatus } = vi.hoisted(() => ({
  mockGenerateAuthUrl: vi.fn(),
  mockSyncUsers: vi.fn(),
  mockGetConnectionStatus: vi.fn(),
}));

// Mock services
vi.mock('@/services/google-workspace', () => ({
  getGoogleWorkspaceConnectionStatus: (...args: unknown[]) => mockGetConnectionStatus(...args),
  syncGoogleWorkspaceUsers: (...args: unknown[]) => mockSyncUsers(...args),
}));

vi.mock('@/services/google-workspace/auth', () => ({
  generateGoogleWorkspaceAuthUrl: (...args: unknown[]) => mockGenerateAuthUrl(...args),
  isGoogleWorkspaceConfigured: () => true,
}));

// Mock OrganizationContext
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: { id: 'org-123', name: 'Test Org' },
  }),
}));

// Mock useAppToast
const mockToast = vi.fn();
vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({ toast: mockToast }),
}));

// Mock TanStack Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
    useQuery: ({ queryFn, enabled }: { queryFn: () => Promise<unknown>; enabled: boolean }) => {
      if (!enabled) {
        return { data: undefined, isLoading: false };
      }
      // Return mock data based on mockGetConnectionStatus
      return { data: mockGetConnectionStatus(), isLoading: false };
    },
  };
});

// Import after mocks
import { GoogleWorkspaceIntegration } from '../GoogleWorkspaceIntegration';

describe('GoogleWorkspaceIntegration', () => {
  beforeEach(() => {
    mockGenerateAuthUrl.mockReset();
    mockSyncUsers.mockReset();
    mockGetConnectionStatus.mockReset();
    mockToast.mockReset();
  });

  it('renders nothing for non-admin users', () => {
    const { container } = customRender(
      <GoogleWorkspaceIntegration currentUserRole="member" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders connect button when not connected', () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: false,
      domain: null,
    });

    customRender(<GoogleWorkspaceIntegration currentUserRole="admin" />);

    expect(screen.getByRole('heading', { name: /google workspace integration/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect google workspace/i })).toBeInTheDocument();
  });

  it('renders sync button when connected', () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: true,
      domain: 'example.com',
    });

    customRender(<GoogleWorkspaceIntegration currentUserRole="owner" />);

    expect(screen.getByText(/connected domain: example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sync directory/i })).toBeInTheDocument();
  });

  it('initiates OAuth flow when connect button is clicked', async () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: false,
      domain: null,
    });
    mockGenerateAuthUrl.mockResolvedValue('https://accounts.google.com/oauth/authorize?...');

    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    customRender(<GoogleWorkspaceIntegration currentUserRole="admin" />);

    const connectButton = screen.getByRole('button', { name: /connect google workspace/i });
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
        organizationId: 'org-123',
        redirectUrl: '/dashboard/organization',
      });
    });

    // Restore window.location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('syncs users when sync button is clicked', async () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: true,
      domain: 'example.com',
    });
    mockSyncUsers.mockResolvedValue({ usersSynced: 15 });

    customRender(<GoogleWorkspaceIntegration currentUserRole="admin" />);

    const syncButton = screen.getByRole('button', { name: /sync directory/i });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(mockSyncUsers).toHaveBeenCalledWith('org-123');
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Directory synced',
        description: '15 users loaded.',
      });
    });
  });

  it('shows error toast when sync fails', async () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: true,
      domain: 'example.com',
    });
    mockSyncUsers.mockRejectedValue(new Error('Failed to sync'));

    customRender(<GoogleWorkspaceIntegration currentUserRole="admin" />);

    const syncButton = screen.getByRole('button', { name: /sync directory/i });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to sync users',
        description: 'Failed to sync',
        variant: 'error',
      });
    });
  });

  it('shows error toast when connect fails', async () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: false,
      domain: null,
    });
    mockGenerateAuthUrl.mockRejectedValue(new Error('OAuth config error'));

    customRender(<GoogleWorkspaceIntegration currentUserRole="admin" />);

    const connectButton = screen.getByRole('button', { name: /connect google workspace/i });
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to connect Google Workspace',
        description: 'OAuth config error',
        variant: 'error',
      });
    });
  });
});
