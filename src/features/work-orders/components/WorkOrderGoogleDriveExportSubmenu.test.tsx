import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@vitest-harness/utils/test-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { WorkOrderGoogleDriveExportSubmenu } from './WorkOrderGoogleDriveExportSubmenu';

const mockUseGoogleWorkspaceConnectionStatus = vi.fn();
const mockUseGoogleWorkspaceExportDestination = vi.fn();
const mockUseLatestExportArtifact = vi.fn();

vi.mock('@/features/organization/hooks/useGoogleWorkspaceConnectionStatus', () => ({
  useGoogleWorkspaceConnectionStatus: (...args: unknown[]) =>
    mockUseGoogleWorkspaceConnectionStatus(...args),
}));

vi.mock('@/features/organization/hooks/useGoogleWorkspaceExportDestination', () => ({
  useGoogleWorkspaceExportDestination: (...args: unknown[]) =>
    mockUseGoogleWorkspaceExportDestination(...args),
}));

vi.mock('@/features/work-orders/hooks/useLatestExportArtifact', () => ({
  useLatestExportArtifact: (...args: unknown[]) => mockUseLatestExportArtifact(...args),
}));

describe('WorkOrderGoogleDriveExportSubmenu', () => {
  const onExportDocs = vi.fn();
  const onExportSheets = vi.fn();
  const onOpenPdfDialog = vi.fn();

  const renderSubmenu = () =>
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger asChild>
          <Button>Export</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <WorkOrderGoogleDriveExportSubmenu
            workOrderId="wo-1"
            organizationId="org-1"
            isManager
            onOpenPdfDialog={onOpenPdfDialog}
            isPdfBusy={false}
            onExportDocs={onExportDocs}
            isExportingDocs={false}
            onExportSheets={onExportSheets}
            isExportingSheets={false}
          />
        </DropdownMenuContent>
      </DropdownMenu>,
    );

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGoogleWorkspaceConnectionStatus.mockReturnValue({
      isConnected: true,
      connectionStatus: {
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/spreadsheets',
        ].join(' '),
      },
    });

    mockUseGoogleWorkspaceExportDestination.mockReturnValue({
      destination: { parent_id: 'folder-1', display_name: 'Ops Exports' },
    });

    mockUseLatestExportArtifact.mockReturnValue({ data: null });
  });

  it('renders the Google Drive submenu trigger when connected', () => {
    renderSubmenu();
    expect(screen.getByRole('menuitem', { name: 'Google Drive' })).toBeInTheDocument();
  });

  it('returns null when Google Workspace is not connected', () => {
    mockUseGoogleWorkspaceConnectionStatus.mockReturnValue({
      isConnected: false,
      connectionStatus: { scopes: '' },
    });

    renderSubmenu();
    expect(screen.queryByRole('menuitem', { name: 'Google Drive' })).not.toBeInTheDocument();
  });
});
