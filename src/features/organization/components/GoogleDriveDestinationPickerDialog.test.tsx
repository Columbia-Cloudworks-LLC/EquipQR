import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { customRender } from '@vitest-harness/utils/renderUtils';

const mockListGoogleDriveDestinations = vi.fn();
const mockCreateGoogleDriveDestinationFolder = vi.fn();
const mockDeleteGoogleDriveDestinationFolder = vi.fn();
const mockToast = vi.fn();

vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({ toast: mockToast }),
}));

vi.mock('@/services/google-workspace', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/google-workspace')>();
  return {
    ...actual,
    listGoogleDriveDestinations: (...args: unknown[]) => mockListGoogleDriveDestinations(...args),
    createGoogleDriveDestinationFolder: (...args: unknown[]) =>
      mockCreateGoogleDriveDestinationFolder(...args),
    deleteGoogleDriveDestinationFolder: (...args: unknown[]) =>
      mockDeleteGoogleDriveDestinationFolder(...args),
  };
});

import {
  GoogleDriveFolderDeleteConfirmationRequiredError,
} from '@/services/google-workspace';
import { GoogleDriveDestinationPickerDialog } from './GoogleDriveDestinationPickerDialog';

describe('GoogleDriveDestinationPickerDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListGoogleDriveDestinations.mockResolvedValue({
      items: [
        {
          id: 'drive-1',
          name: 'Ops Shared Drive',
          kind: 'shared_drive',
          driveId: 'drive-1',
          selectable: false,
          parentId: null,
        },
      ],
      parentId: null,
      driveId: null,
    });
    mockCreateGoogleDriveDestinationFolder.mockResolvedValue({
      id: 'folder-new',
      name: 'New Folder',
      kind: 'folder',
      driveId: 'drive-1',
      selectable: true,
      parentId: 'drive-1',
    });
    mockDeleteGoogleDriveDestinationFolder.mockResolvedValue({
      deleted: true,
      folderId: 'folder-empty',
      hadContents: false,
      childCount: 0,
    });
  });

  it('navigates into a shared drive using root parentId and driveId', async () => {
    mockListGoogleDriveDestinations
      .mockResolvedValueOnce({
        items: [
          {
            id: 'drive-1',
            name: 'Ops Shared Drive',
            kind: 'shared_drive',
            driveId: 'drive-1',
            selectable: false,
            parentId: null,
          },
        ],
        parentId: null,
        driveId: null,
      })
      .mockResolvedValueOnce({
        items: [],
        parentId: 'root',
        driveId: 'drive-1',
      });

    customRender(
      <GoogleDriveDestinationPickerDialog
        open
        onOpenChange={vi.fn()}
        organizationId="org-1"
        organizationName="Test Org"
        workspaceDomain="example.com"
        connectedEmail="admin@example.com"
        onSelect={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const openButton = await screen.findByRole('button', { name: 'Open Ops Shared Drive' });
    await userEvent.click(openButton);

    await waitFor(() => {
      expect(mockListGoogleDriveDestinations).toHaveBeenCalledWith({
        organizationId: 'org-1',
        parentId: 'root',
        driveId: 'drive-1',
      });
    });
  });

  it('creates a folder at My Drive root from All locations', async () => {
    const user = userEvent.setup();

    customRender(
      <GoogleDriveDestinationPickerDialog
        open
        onOpenChange={vi.fn()}
        organizationId="org-1"
        organizationName="Test Org"
        workspaceDomain="example.com"
        connectedEmail="admin@example.com"
        onSelect={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await screen.findByRole('button', { name: 'Open Ops Shared Drive' });
    await user.type(screen.getByLabelText('New folder name'), 'EquipQR Root');
    await user.click(screen.getByRole('button', { name: /create folder/i }));

    await waitFor(() => {
      expect(mockCreateGoogleDriveDestinationFolder).toHaveBeenCalledWith({
        organizationId: 'org-1',
        parentId: 'root',
        driveId: null,
        name: 'EquipQR Root',
      });
    });
  });

  it('creates a folder in the current browse location', async () => {
    const user = userEvent.setup();

    mockListGoogleDriveDestinations
      .mockResolvedValueOnce({
        items: [
          {
            id: 'drive-1',
            name: 'Ops Shared Drive',
            kind: 'shared_drive',
            driveId: 'drive-1',
            selectable: false,
            parentId: null,
          },
        ],
        parentId: null,
        driveId: null,
      })
      .mockResolvedValueOnce({
        items: [],
        parentId: 'root',
        driveId: 'drive-1',
      });

    customRender(
      <GoogleDriveDestinationPickerDialog
        open
        onOpenChange={vi.fn()}
        organizationId="org-1"
        organizationName="Test Org"
        workspaceDomain="example.com"
        connectedEmail="admin@example.com"
        onSelect={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Open Ops Shared Drive' }));
    await user.type(screen.getByLabelText('New folder name'), 'EquipQR Exports');
    await user.click(screen.getByRole('button', { name: /create folder/i }));

    await waitFor(() => {
      expect(mockCreateGoogleDriveDestinationFolder).toHaveBeenCalledWith({
        organizationId: 'org-1',
        parentId: 'root',
        driveId: 'drive-1',
        name: 'EquipQR Exports',
      });
    });
  });

  it('deletes empty folders without opening the confirmation dialog', async () => {
    const user = userEvent.setup();

    mockListGoogleDriveDestinations.mockResolvedValue({
      items: [
        {
          id: 'folder-empty',
          name: 'Empty Folder',
          kind: 'folder',
          driveId: null,
          selectable: true,
          parentId: 'root',
        },
      ],
      parentId: 'root',
      driveId: null,
    });

    customRender(
      <GoogleDriveDestinationPickerDialog
        open
        onOpenChange={vi.fn()}
        organizationId="org-1"
        organizationName="Test Org"
        workspaceDomain="example.com"
        connectedEmail="admin@example.com"
        onSelect={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Delete Empty Folder' }));

    await waitFor(() => {
      expect(mockDeleteGoogleDriveDestinationFolder).toHaveBeenCalledWith({
        organizationId: 'org-1',
        folderId: 'folder-empty',
        confirmDataLoss: false,
      });
    });

    expect(screen.queryByText(/delete folder and contents/i)).not.toBeInTheDocument();
  });

  it('requires confirmation before deleting folders with contents', async () => {
    const user = userEvent.setup();

    mockListGoogleDriveDestinations.mockResolvedValue({
      items: [
        {
          id: 'folder-full',
          name: 'Busy Folder',
          kind: 'folder',
          driveId: null,
          selectable: true,
          parentId: 'root',
        },
      ],
      parentId: 'root',
      driveId: null,
    });

    mockDeleteGoogleDriveDestinationFolder.mockImplementation(async ({ confirmDataLoss }) => {
      if (!confirmDataLoss) {
        throw new GoogleDriveFolderDeleteConfirmationRequiredError(
          'This folder contains files or subfolders.',
          3,
        );
      }

      return {
        deleted: true,
        folderId: 'folder-full',
        hadContents: true,
        childCount: 3,
      };
    });

    customRender(
      <GoogleDriveDestinationPickerDialog
        open
        onOpenChange={vi.fn()}
        organizationId="org-1"
        organizationName="Test Org"
        workspaceDomain="example.com"
        connectedEmail="admin@example.com"
        onSelect={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Delete Busy Folder' }));

    expect(await screen.findByText(/delete folder and contents/i)).toBeInTheDocument();
    expect(screen.getByText(/columbia cloudworks llc is not responsible/i)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /i understand this permanently deletes/i }));
    await user.click(screen.getByRole('button', { name: /^delete folder$/i }));

    await waitFor(() => {
      expect(mockDeleteGoogleDriveDestinationFolder).toHaveBeenLastCalledWith({
        organizationId: 'org-1',
        folderId: 'folder-full',
        confirmDataLoss: true,
      });
    });
  });
});
