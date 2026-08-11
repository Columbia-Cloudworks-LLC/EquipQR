import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { customRender } from '@vitest-harness/utils/renderUtils';

const {
  mockSyncUsers,
  mockGetConnectionStatus,
  mockConnect,
  mockDisconnectMutate,
  mockUseGoogleWorkspaceConnect,
} = vi.hoisted(() => ({
  mockSyncUsers: vi.fn(),
  mockGetConnectionStatus: vi.fn(),
  mockConnect: vi.fn(),
  mockDisconnectMutate: vi.fn(),
  mockUseGoogleWorkspaceConnect: vi.fn(),
}));

vi.mock('@/services/google-workspace', () => ({
  getGoogleWorkspaceConnectionStatus: (...args: unknown[]) => mockGetConnectionStatus(...args),
  syncGoogleWorkspaceUsers: (...args: unknown[]) => mockSyncUsers(...args),
}));

vi.mock('@/services/google-workspace/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/google-workspace/auth')>();
  return {
    ...actual,
    isGoogleWorkspaceConfigured: () => true,
  };
});

vi.mock('@/features/organization/hooks/useGoogleWorkspaceConnect', () => ({
  useGoogleWorkspaceConnect: (options: unknown) => {
    mockUseGoogleWorkspaceConnect(options);
    return {
      connect: mockConnect,
      isConnecting: false,
    };
  },
}));

vi.mock('@/features/organization/hooks/useGoogleWorkspaceDisconnect', () => ({
  useGoogleWorkspaceDisconnect: () => ({
    mutate: mockDisconnectMutate,
    isPending: false,
  }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: { id: 'org-123', name: 'Test Org' },
  }),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({ toast: mockToast }),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
    useQuery: ({ enabled }: { queryFn: () => Promise<unknown>; enabled: boolean }) => {
      if (!enabled) {
        return { data: undefined, isLoading: false };
      }
      return { data: mockGetConnectionStatus(), isLoading: false };
    },
  };
});

import { GoogleWorkspaceIntegration } from './GoogleWorkspaceIntegration';

const fullWorkspaceScopes = [
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents',
].join(' ');

describe('GoogleWorkspaceIntegration', () => {
  beforeEach(() => {
    mockSyncUsers.mockReset();
    mockGetConnectionStatus.mockReset();
    mockConnect.mockReset();
    mockDisconnectMutate.mockReset();
    mockUseGoogleWorkspaceConnect.mockReset();
    mockToast.mockReset();
  });

  it('renders nothing for non-admin users', () => {
    customRender(<GoogleWorkspaceIntegration currentUserRole="member" />);

    expect(screen.queryByText('Google Workspace')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Connect$/ })).not.toBeInTheDocument();
  });

  it('renders connect button when not connected', () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: false,
      domain: null,
      scopes: null,
    });

    customRender(<GoogleWorkspaceIntegration currentUserRole="admin" />);

    expect(screen.getByText('Google Workspace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Connect$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Reconnect$/ })).not.toBeInTheDocument();
  });

  it('configures normal connect for directory consent', () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: false,
      domain: null,
      scopes: null,
    });

    customRender(<GoogleWorkspaceIntegration currentUserRole="admin" />);

    expect(mockUseGoogleWorkspaceConnect).toHaveBeenCalledWith({
      organizationId: 'org-123',
      redirectUrl: '/dashboard/organization/integrations',
      consentMode: 'directory',
    });
  });

  it('renders sync and disconnect actions when healthy connected', () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: true,
      domain: 'example.com',
      scopes: fullWorkspaceScopes,
    });

    customRender(<GoogleWorkspaceIntegration currentUserRole="owner" />);

    expect(screen.getByText(/Domain: example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sync directory/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Disconnect$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Reconnect$/ })).not.toBeInTheDocument();
  });

  it('shows finish authorization state when required scopes are missing', () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: true,
      domain: 'example.com',
      scopes: 'https://www.googleapis.com/auth/admin.directory.user.readonly',
    });

    customRender(<GoogleWorkspaceIntegration currentUserRole="owner" />);

    expect(screen.getByText('Permissions needed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sync directory/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /finish authorization/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Reconnect$/ })).not.toBeInTheDocument();
  });

  it('shows sync directory when connected with unknown null scopes', () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: true,
      domain: 'example.com',
      scopes: null,
    });

    customRender(<GoogleWorkspaceIntegration currentUserRole="owner" />);

    expect(screen.getByText('Permissions needed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sync directory/i })).toBeInTheDocument();
  });

  it('configures finish authorization for export consent', () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: true,
      domain: 'example.com',
      scopes: 'https://www.googleapis.com/auth/admin.directory.user.readonly',
    });

    customRender(<GoogleWorkspaceIntegration currentUserRole="owner" />);

    expect(mockUseGoogleWorkspaceConnect).toHaveBeenCalledWith({
      organizationId: 'org-123',
      redirectUrl: '/dashboard/organization/integrations',
      consentMode: 'export',
    });
  });

  it('starts OAuth flow from finish authorization action', () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: true,
      domain: 'example.com',
      scopes: 'https://www.googleapis.com/auth/admin.directory.user.readonly',
    });

    customRender(<GoogleWorkspaceIntegration currentUserRole="owner" />);

    fireEvent.click(screen.getByRole('button', { name: /finish authorization/i }));
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('opens disconnect dialog and calls disconnect mutation on confirm', async () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: true,
      domain: 'example.com',
      scopes: fullWorkspaceScopes,
    });

    customRender(<GoogleWorkspaceIntegration currentUserRole="owner" />);

    fireEvent.click(screen.getByRole('button', { name: /^Disconnect$/ }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Disconnect Google Workspace?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Disconnect Google Workspace$/ }));

    await waitFor(() => {
      expect(mockDisconnectMutate).toHaveBeenCalledTimes(1);
    });
  });

  it('initiates OAuth flow when connect button is clicked', () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: false,
      domain: null,
      scopes: null,
    });

    customRender(<GoogleWorkspaceIntegration currentUserRole="admin" />);

    fireEvent.click(screen.getByRole('button', { name: /^Connect$/ }));
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('syncs users when sync button is clicked', async () => {
    mockGetConnectionStatus.mockReturnValue({
      is_connected: true,
      domain: 'example.com',
      scopes: fullWorkspaceScopes,
    });
    mockSyncUsers.mockResolvedValue({ usersSynced: 15 });

    customRender(<GoogleWorkspaceIntegration currentUserRole="admin" />);

    fireEvent.click(screen.getByRole('button', { name: /sync directory/i }));

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
      scopes: fullWorkspaceScopes,
    });
    mockSyncUsers.mockRejectedValue(new Error('Failed to sync'));

    customRender(<GoogleWorkspaceIntegration currentUserRole="admin" />);

    fireEvent.click(screen.getByRole('button', { name: /sync directory/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to sync users',
        description: 'Failed to sync',
        variant: 'error',
      });
    });
  });
});
