import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { customRender } from '@vitest-harness/utils/renderUtils';

const {
  mockConnectionStatus,
  mockExportDestination,
  mockListGoogleDriveDestinations,
  mockToast,
  mockUseGoogleWorkspaceConnect,
  mockGrantDrivePermissions,
} = vi.hoisted(() => ({
  mockConnectionStatus: vi.fn(),
  mockExportDestination: vi.fn(),
  mockListGoogleDriveDestinations: vi.fn(),
  mockToast: vi.fn(),
  mockUseGoogleWorkspaceConnect: vi.fn(),
  mockGrantDrivePermissions: vi.fn(),
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

vi.mock('@/features/organization/hooks/useGoogleWorkspaceConnect', () => ({
  useGoogleWorkspaceConnect: (options: { consentMode?: 'directory' | 'export' }) =>
    mockUseGoogleWorkspaceConnect(options),
}));

vi.mock('@/features/organization/hooks/useGoogleWorkspaceExportDestination', () => ({
  useGoogleWorkspaceExportDestination: (...args: unknown[]) => mockExportDestination(...args),
}));

vi.mock('@/services/google-workspace', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/google-workspace')>();
  return {
    ...actual,
    listGoogleDriveDestinations: (...args: unknown[]) => mockListGoogleDriveDestinations(...args),
  };
});

vi.mock('@/services/google-workspace/auth', () => ({
  GOOGLE_EXPORT_DESTINATION_REQUIRED_SCOPES: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/documents',
  ],
  hasAllGoogleScopes: (currentScopes: string | null | undefined, requiredScopes: readonly string[]) => {
    if (!currentScopes) return false;
    const grantedScopes = new Set(currentScopes.split(' '));
    return requiredScopes.every((scope) => grantedScopes.has(scope));
  },
}));

import { GoogleWorkspaceExportDestinationCard } from './GoogleWorkspaceExportDestinationCard';

const fullScopes =
  'https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents';

function mockConnectedStatus(overrides: Record<string, unknown> = {}) {
  mockConnectionStatus.mockReturnValue({
    isConnected: true,
    domain: 'example.com',
    connectionStatus: {
      is_connected: true,
      domain: 'example.com',
      connected_email: 'admin@example.com',
      connected_at: null,
      access_token_expires_at: null,
      scopes: fullScopes,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  });
}

describe('GoogleWorkspaceExportDestinationCard', () => {
  beforeEach(() => {
    mockConnectionStatus.mockReset();
    mockExportDestination.mockReset();
    mockListGoogleDriveDestinations.mockReset();
    mockToast.mockReset();
    mockUseGoogleWorkspaceConnect.mockReset();
    mockGrantDrivePermissions.mockReset();

    mockUseGoogleWorkspaceConnect.mockImplementation((options: { consentMode?: 'directory' | 'export' }) => ({
      connect: mockGrantDrivePermissions,
      isConnecting: false,
      consentMode: options?.consentMode,
    }));

    mockConnectedStatus();

    mockExportDestination.mockReturnValue({
      destination: null,
      isLoadingDestination: false,
      setDestination: vi.fn(),
      isSettingDestination: false,
    });

    mockListGoogleDriveDestinations.mockResolvedValue({
      items: [
        {
          id: 'folder-123',
          name: 'Ops Exports',
          kind: 'folder',
          driveId: null,
          selectable: true,
          parentId: null,
        },
      ],
    });
  });

  it('blocks folder selection and shows grant permissions guidance when required scopes are missing', () => {
    mockConnectionStatus.mockReturnValue({
      isConnected: true,
      domain: 'example.com',
      connectionStatus: {
        is_connected: true,
        domain: 'example.com',
        connected_email: 'admin@example.com',
        connected_at: null,
        access_token_expires_at: null,
        scopes: 'https://www.googleapis.com/auth/admin.directory.user.readonly',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    customRender(<GoogleWorkspaceExportDestinationCard currentUserRole="owner" />);

    expect(
      screen.getByText(/grant google drive permissions before choosing an organization folder/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grant drive permissions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose organization folder/i })).toBeDisabled();
    expect(mockUseGoogleWorkspaceConnect).toHaveBeenCalledWith(
      expect.objectContaining({ consentMode: 'export' }),
    );
  });

  it('shows connected admin email and organization file storage title', () => {
    customRender(<GoogleWorkspaceExportDestinationCard currentUserRole="owner" />);

    expect(screen.getByText('Google Drive File Storage')).toBeInTheDocument();
    expect(screen.getByText(/authorized by admin@example.com/i)).toBeInTheDocument();
  });

  it('shows a grant permissions message when destination save fails because drive scopes are stale', async () => {
    const user = userEvent.setup();
    const setDestination = vi.fn().mockRejectedValue(
      Object.assign(new Error('Stale scopes'), { code: 'insufficient_scopes' })
    );

    mockExportDestination.mockReturnValue({
      destination: null,
      isLoadingDestination: false,
      setDestination,
      isSettingDestination: false,
    });

    customRender(<GoogleWorkspaceExportDestinationCard currentUserRole="owner" />);

    await user.click(screen.getByRole('button', { name: /choose organization folder/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /select/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Grant Google Drive permissions',
        description:
          'Google Workspace needs updated Drive permissions. Use Grant permissions on the Integrations page, then try again.',
        variant: 'error',
      });
    });
  });

  it('shows an expired-connection message when destination save fails because the Workspace token was revoked', async () => {
    const user = userEvent.setup();
    const setDestination = vi.fn().mockRejectedValue(
      Object.assign(new Error('Token revoked'), { code: 'token_revoked' })
    );

    mockExportDestination.mockReturnValue({
      destination: null,
      isLoadingDestination: false,
      setDestination,
      isSettingDestination: false,
    });

    customRender(<GoogleWorkspaceExportDestinationCard currentUserRole="owner" />);

    await user.click(screen.getByRole('button', { name: /choose organization folder/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /select/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Google Workspace Connection Expired',
        description:
          'Your Google Workspace connection expired or was revoked. Disconnect and connect again on the Integrations page, then try again.',
        variant: 'error',
      });
    });
  });

  it('shows the saved destination state after a successful folder selection', async () => {
    const user = userEvent.setup();
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

    mockExportDestination.mockReturnValue({
      destination: null,
      isLoadingDestination: false,
      setDestination,
      isSettingDestination: false,
    });

    const { rerender } = customRender(
      <GoogleWorkspaceExportDestinationCard currentUserRole="owner" />
    );

    await user.click(screen.getByRole('button', { name: /choose organization folder/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /select/i }));

    await waitFor(() => {
      expect(setDestination).toHaveBeenCalledWith({
        selectionKind: 'folder',
        parentId: 'folder-123',
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Organization folder saved',
        description: 'EquipQR files for Test Org will save to Ops Exports.',
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
        display_name: 'Marketing',
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

    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('My Drive folder')).toBeInTheDocument();
  });

  it('shows folder organization checkboxes when a destination is configured', () => {
    mockExportDestination.mockReturnValue({
      destination: {
        id: 'dest-1',
        organization_id: 'org-123',
        document_type: 'work-orders-internal-packet',
        selection_kind: 'folder',
        drive_id: null,
        parent_id: 'folder-123',
        display_name: 'Marketing',
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

    expect(screen.getByText('Subfolder routing')).toBeInTheDocument();
    expect(screen.getByText(/example export path/i)).toBeInTheDocument();
    expect(
      screen.getByText('Marketing / Field Service / Work Order Packet'),
    ).toBeInTheDocument();

    const teamCheckbox = screen.getByRole('checkbox', { name: /organize by team/i });
    const equipmentCheckbox = screen.getByRole('checkbox', { name: /organize by equipment/i });

    expect(teamCheckbox).toBeChecked();
    expect(equipmentCheckbox).not.toBeChecked();
  });

  it('hides folder organization checkboxes when no destination is configured', () => {
    customRender(<GoogleWorkspaceExportDestinationCard currentUserRole="owner" />);

    expect(screen.queryByText('Subfolder routing')).not.toBeInTheDocument();
  });

  it('calls setDestination with folder flag when a checkbox is toggled', async () => {
    const user = userEvent.setup();
    const setDestination = vi.fn().mockResolvedValue({});

    mockExportDestination.mockReturnValue({
      destination: {
        id: 'dest-1',
        organization_id: 'org-123',
        document_type: 'work-orders-internal-packet',
        selection_kind: 'folder',
        drive_id: null,
        parent_id: 'folder-123',
        display_name: 'Marketing',
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
    await user.click(equipmentCheckbox);

    await waitFor(() => {
      expect(setDestination).toHaveBeenCalledWith({
        selectionKind: 'folder',
        parentId: 'folder-123',
        folderByEquipment: false,
      });
    });
  });
});

