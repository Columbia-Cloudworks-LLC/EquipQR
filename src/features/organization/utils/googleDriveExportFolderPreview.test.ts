import { describe, expect, it } from 'vitest';
import {
  buildGoogleDriveExportFolderPreview,
  formatGoogleDriveExportFolderPath,
  getGoogleDriveExportFolderRoutingSummary,
} from '@/features/organization/utils/googleDriveExportFolderPreview';

describe('googleDriveExportFolderPreview', () => {
  it('builds a root-only path when both routing flags are disabled', () => {
    const segments = buildGoogleDriveExportFolderPreview({
      rootFolderName: 'Marketing',
      folderByTeam: false,
      folderByEquipment: false,
    });

    expect(segments).toEqual([
      { name: 'Marketing', depth: 0, kind: 'root' },
      { name: 'Work Order Packet', depth: 1, kind: 'file' },
    ]);
    expect(formatGoogleDriveExportFolderPath(segments)).toBe('Marketing / Work Order Packet');
    expect(
      getGoogleDriveExportFolderRoutingSummary({
        folderByTeam: false,
        folderByEquipment: false,
      }),
    ).toBe('Exports save directly in your organization folder with no subfolders.');
  });

  it('builds team then equipment subfolders when both flags are enabled', () => {
    const segments = buildGoogleDriveExportFolderPreview({
      rootFolderName: 'Marketing',
      folderByTeam: true,
      folderByEquipment: true,
    });

    expect(segments.map((segment) => segment.kind)).toEqual(['root', 'team', 'equipment', 'file']);
    expect(formatGoogleDriveExportFolderPath(segments)).toBe(
      'Marketing / Field Service / CAT 320 Excavator / Work Order Packet',
    );
    expect(
      getGoogleDriveExportFolderRoutingSummary({
        folderByTeam: true,
        folderByEquipment: true,
      }),
    ).toBe('Exports are grouped by team, then by equipment.');
  });

  it('builds equipment-only routing when team routing is disabled', () => {
    const segments = buildGoogleDriveExportFolderPreview({
      rootFolderName: 'Marketing',
      folderByTeam: false,
      folderByEquipment: true,
    });

    expect(formatGoogleDriveExportFolderPath(segments)).toBe(
      'Marketing / CAT 320 Excavator / Work Order Packet',
    );
    expect(
      getGoogleDriveExportFolderRoutingSummary({
        folderByTeam: false,
        folderByEquipment: true,
      }),
    ).toBe('Exports are grouped by equipment only.');
  });
});
