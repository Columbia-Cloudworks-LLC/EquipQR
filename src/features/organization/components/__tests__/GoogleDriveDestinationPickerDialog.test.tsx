import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { customRender } from '@/test/utils/renderUtils';

const mockListGoogleDriveDestinations = vi.fn();

vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/services/google-workspace', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/google-workspace')>();
  return {
    ...actual,
    listGoogleDriveDestinations: (...args: unknown[]) => mockListGoogleDriveDestinations(...args),
  };
});

import { GoogleDriveDestinationPickerDialog } from '../GoogleDriveDestinationPickerDialog';

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
});
