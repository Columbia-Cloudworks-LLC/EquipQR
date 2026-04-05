import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { customRender } from '@/test/utils/renderUtils';

const {
  mockConnectionStatus,
  mockExportDestination,
  mockGetGooglePickerConfig,
  mockIsGooglePickerConfigured,
  mockToast,
} = vi.hoisted(() => ({
  mockConnectionStatus: vi.fn(),
  mockExportDestination: vi.fn(),
  mockGetGooglePickerConfig: vi.fn(),
  mockIsGooglePickerConfigured: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: { id: 'org-123', name: 'Test Org' },
  }),
}));

vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({ toast: mockToast }),
}));

vi.mock('@/features/organization/hooks/useGoogleWorkspaceConnectionStatus', () => ({
  useGoogleWorkspaceConnectionStatus: (...args: unknown[]) => mockConnectionStatus(...args),
}));

vi.mock('@/features/organization/hooks/useGoogleWorkspaceExportDestination', () => ({
  useGoogleWorkspaceExportDestination: (...args: unknown[]) => mockExportDestination(...args),
}));

vi.mock('@/services/google-workspace/auth', () => ({
  GOOGLE_EXPORT_DESTINATION_REQUIRED_SCOPES: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/documents',
  ],
  GOOGLE_PICKER_SCOPE: 'https://www.googleapis.com/auth/drive.readonly',
  getGooglePickerConfig: (...args: unknown[]) => mockGetGooglePickerConfig(...args),
  hasAllGoogleScopes: (currentScopes: string | null | undefined, requiredScopes: readonly string[]) => {
    if (!currentScopes) return false;
    const grantedScopes = new Set(currentScopes.split(' '));
    return requiredScopes.every((scope) => grantedScopes.has(scope));
  },
  isGooglePickerConfigured: (...args: unknown[]) => mockIsGooglePickerConfigured(...args),
}));

import { GoogleWorkspaceExportDestinationCard } from '../GoogleWorkspaceExportDestinationCard';

function installLoadedGoogleScripts() {
  const apiScript = document.createElement('script');
  apiScript.src = 'https://apis.google.com/js/api.js';
  apiScript.dataset.loaded = 'true';
  document.head.appendChild(apiScript);

  const gsiScript = document.createElement('script');
  gsiScript.src = 'https://accounts.google.com/gsi/client';
  gsiScript.dataset.loaded = 'true';
  document.head.appendChild(gsiScript);
}

function configurePickerSelection() {
  let pickerCallback:
    | ((data: { action: string; docs?: Array<{ id?: string; driveId?: string }> }) => void)
    | undefined;

  window.gapi = {
    load: (_library, options) => {
      options.callback();
    },
  };

  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: ({ callback }) => ({
          requestAccessToken: () => callback({ access_token: 'picker-token' }),
        }),
      },
    },
    picker: {
      Action: {
        PICKED: 'picked',
      },
      DocsView: class {
        setIncludeFolders() {
          return this;
        }

        setSelectFolderEnabled() {
          return this;
        }
      },
      PickerBuilder: class {
        addView() {
          return this;
        }

        setOAuthToken() {
          return this;
        }

        setDeveloperKey() {
          return this;
        }

        setAppId() {
          return this;
        }

        setTitle() {
          return this;
        }

        setCallback(callback: typeof pickerCallback) {
          pickerCallback = callback;
          return this;
        }

        build() {
          return {
            setVisible: (visible: boolean) => {
              if (visible && pickerCallback) {
                void pickerCallback({
                  action: 'picked',
                  docs: [{ id: 'folder-123' }],
                });
              }
            },
          };
        }
      },
    },
  };
}

describe('GoogleWorkspaceExportDestinationCard', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    window.google = undefined;
    window.gapi = undefined;

    mockConnectionStatus.mockReset();
    mockExportDestination.mockReset();
    mockGetGooglePickerConfig.mockReset();
    mockIsGooglePickerConfigured.mockReset();
    mockToast.mockReset();

    mockConnectionStatus.mockReturnValue({
      isConnected: true,
      domain: 'example.com',
      connectionStatus: {
        is_connected: true,
        domain: 'example.com',
        connected_at: null,
        access_token_expires_at: null,
        scopes: 'https://www.googleapis.com/auth/admin.directory.user.readonly',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockExportDestination.mockReturnValue({
      destination: null,
      isLoadingDestination: false,
      setDestination: vi.fn(),
      isSettingDestination: false,
    });

    mockIsGooglePickerConfigured.mockReturnValue(true);
    mockGetGooglePickerConfig.mockReturnValue({
      apiKey: 'api-key',
      appId: 'app-id',
      clientId: 'client-id',
      scope: 'https://www.googleapis.com/auth/drive.readonly',
    });
  });

  it('blocks destination selection and shows reconnect guidance when required scopes are missing', () => {
    customRender(<GoogleWorkspaceExportDestinationCard currentUserRole="owner" />);

    expect(
      screen.getByText(/reconnect google workspace to refresh google docs and drive permissions before choosing a destination/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose destination/i })).toBeDisabled();
  });

  it('requires reconnect when the Docs scope is missing but drive scopes are present', () => {
    mockConnectionStatus.mockReturnValue({
      isConnected: true,
      domain: 'example.com',
      connectionStatus: {
        is_connected: true,
        domain: 'example.com',
        connected_at: null,
        access_token_expires_at: null,
        scopes:
          'https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    customRender(<GoogleWorkspaceExportDestinationCard currentUserRole="owner" />);

    expect(
      screen.getByText(/reconnect google workspace to refresh google docs and drive permissions before choosing a destination/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose destination/i })).toBeDisabled();
  });

  it('shows a reconnect message when destination save fails because drive scopes are stale', async () => {
    installLoadedGoogleScripts();
    configurePickerSelection();

    const setDestination = vi.fn().mockRejectedValue(
      Object.assign(new Error('Stale scopes'), { code: 'insufficient_scopes' })
    );

    mockConnectionStatus.mockReturnValue({
      isConnected: true,
      domain: 'example.com',
      connectionStatus: {
        is_connected: true,
        domain: 'example.com',
        connected_at: null,
        access_token_expires_at: null,
        scopes:
          'https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockExportDestination.mockReturnValue({
      destination: null,
      isLoadingDestination: false,
      setDestination,
      isSettingDestination: false,
    });

    customRender(<GoogleWorkspaceExportDestinationCard currentUserRole="owner" />);

    screen.getByRole('button', { name: /choose destination/i }).click();

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Reconnect Google Workspace',
        description:
          'Google Workspace needs updated Drive permissions. Reconnect Google Workspace in Organization Settings, then try again.',
        variant: 'error',
      });
    });
  });

  it('shows an expired-connection message when destination save fails because the Workspace token was revoked', async () => {
    installLoadedGoogleScripts();
    configurePickerSelection();

    const setDestination = vi.fn().mockRejectedValue(
      Object.assign(new Error('Token revoked'), { code: 'token_revoked' })
    );

    mockConnectionStatus.mockReturnValue({
      isConnected: true,
      domain: 'example.com',
      connectionStatus: {
        is_connected: true,
        domain: 'example.com',
        connected_at: null,
        access_token_expires_at: null,
        scopes:
          'https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockExportDestination.mockReturnValue({
      destination: null,
      isLoadingDestination: false,
      setDestination,
      isSettingDestination: false,
    });

    customRender(<GoogleWorkspaceExportDestinationCard currentUserRole="owner" />);

    screen.getByRole('button', { name: /choose destination/i }).click();

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Google Workspace Connection Expired',
        description:
          'Your Google Workspace connection expired or was revoked. Reconnect Google Workspace in Organization Settings, then try again.',
        variant: 'error',
      });
    });
  });

  it('shows a disconnected message when destination save fails because the Workspace connection no longer exists', async () => {
    installLoadedGoogleScripts();
    configurePickerSelection();

    const setDestination = vi.fn().mockRejectedValue(
      Object.assign(new Error('Not connected'), { code: 'not_connected' })
    );

    mockConnectionStatus.mockReturnValue({
      isConnected: true,
      domain: 'example.com',
      connectionStatus: {
        is_connected: true,
        domain: 'example.com',
        connected_at: null,
        access_token_expires_at: null,
        scopes:
          'https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockExportDestination.mockReturnValue({
      destination: null,
      isLoadingDestination: false,
      setDestination,
      isSettingDestination: false,
    });

    customRender(<GoogleWorkspaceExportDestinationCard currentUserRole="owner" />);

    screen.getByRole('button', { name: /choose destination/i }).click();

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Google Workspace Not Connected',
        description:
          'Google Workspace is no longer connected for this organization. Reconnect Google Workspace in Organization Settings, then try again.',
        variant: 'error',
      });
    });
  });

  it('shows the saved destination state after a successful picker selection', async () => {
    installLoadedGoogleScripts();
    configurePickerSelection();

    const setDestination = vi.fn().mockResolvedValue({
      id: 'destination-1',
      organization_id: 'org-123',
      document_type: 'work-orders-internal-packet',
      selection_kind: 'folder',
      drive_id: null,
      parent_id: 'folder-123',
      display_name: 'Ops Exports',
      web_view_link: null,
      configured_by: 'user-123',
      folder_by_team: true,
      folder_by_equipment: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    mockConnectionStatus.mockReturnValue({
      isConnected: true,
      domain: 'example.com',
      connectionStatus: {
        is_connected: true,
        domain: 'example.com',
        connected_at: null,
        access_token_expires_at: null,
        scopes:
          'https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockExportDestination.mockReturnValue({
      destination: null,
      isLoadingDestination: false,
      setDestination,
      isSettingDestination: false,
    });

    const { rerender } = customRender(
      <GoogleWorkspaceExportDestinationCard currentUserRole="owner" />
    );

    screen.getByRole('button', { name: /choose destination/i }).click();

    await waitFor(() => {
      expect(setDestination).toHaveBeenCalledWith({
        selectionKind: 'folder',
        parentId: 'folder-123',
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Destination Saved',
        description: 'Google Docs exports will use the selected destination.',
      });
    });

    mockExportDestination.mockReturnValue({
      destination: {
        id: 'destination-1',
        organization_id: 'org-123',
        document_type: 'work-orders-internal-packet',
        selection_kind: 'folder',
        drive_id: null,
        parent_id: 'folder-123',
        display_name: 'Ops Exports',
        web_view_link: null,
        configured_by: 'user-123',
        folder_by_team: true,
        folder_by_equipment: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      isLoadingDestination: false,
      setDestination,
      isSettingDestination: false,
    });

    rerender(<GoogleWorkspaceExportDestinationCard currentUserRole="owner" />);

    expect(screen.getByText('Ops Exports')).toBeInTheDocument();
    expect(screen.getByText(/my drive folder/i)).toBeInTheDocument();
  });

  it('shows folder organization checkboxes when a destination is configured', () => {
    mockConnectionStatus.mockReturnValue({
      isConnected: true,
      connectionStatus: {
        scopes:
          'https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents',
      },
      isLoading: false,
    });

    mockExportDestination.mockReturnValue({
      destination: {
        id: 'dest-1',
        organization_id: 'org-123',
        document_type: 'work-orders-internal-packet',
        selection_kind: 'folder',
        drive_id: null,
        parent_id: 'folder-123',
        display_name: 'Ops Exports',
        web_view_link: null,
        configured_by: 'user-1',
        folder_by_team: true,
        folder_by_equipment: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      isLoadingDestination: false,
      setDestination: vi.fn(),
      isSettingDestination: false,
    });

    customRender(<GoogleWorkspaceExportDestinationCard currentUserRole="owner" />);

    expect(screen.getByText('Folder Organization')).toBeInTheDocument();

    const teamCheckbox = screen.getByRole('checkbox', { name: /organize by team/i });
    const equipmentCheckbox = screen.getByRole('checkbox', { name: /organize by equipment/i });

    expect(teamCheckbox).toBeChecked();
    expect(equipmentCheckbox).not.toBeChecked();
  });

  it('hides folder organization checkboxes when no destination is configured', () => {
    mockConnectionStatus.mockReturnValue({
      isConnected: true,
      connectionStatus: {
        scopes:
          'https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents',
      },
      isLoading: false,
    });

    mockExportDestination.mockReturnValue({
      destination: null,
      isLoadingDestination: false,
      setDestination: vi.fn(),
      isSettingDestination: false,
    });

    customRender(<GoogleWorkspaceExportDestinationCard currentUserRole="owner" />);

    expect(screen.queryByText('Folder Organization')).not.toBeInTheDocument();
  });

  it('calls setDestination with folder flag when a checkbox is toggled', async () => {
    const setDestination = vi.fn().mockResolvedValue({});

    mockConnectionStatus.mockReturnValue({
      isConnected: true,
      connectionStatus: {
        scopes:
          'https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents',
      },
      isLoading: false,
    });

    mockExportDestination.mockReturnValue({
      destination: {
        id: 'dest-1',
        organization_id: 'org-123',
        document_type: 'work-orders-internal-packet',
        selection_kind: 'folder',
        drive_id: null,
        parent_id: 'folder-123',
        display_name: 'Ops Exports',
        web_view_link: null,
        configured_by: 'user-1',
        folder_by_team: true,
        folder_by_equipment: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      isLoadingDestination: false,
      setDestination,
      isSettingDestination: false,
    });

    customRender(<GoogleWorkspaceExportDestinationCard currentUserRole="owner" />);

    const equipmentCheckbox = screen.getByRole('checkbox', { name: /organize by equipment/i });
    equipmentCheckbox.click();

    await waitFor(() => {
      expect(setDestination).toHaveBeenCalledWith({
        selectionKind: 'folder',
        parentId: 'folder-123',
        folderByEquipment: false,
      });
    });
  });
});
