import { describe, expect, it } from 'vitest';
import { resolveDriveFolderCreateTarget } from '@/features/organization/utils/googleDriveFolderCreateTarget';

describe('resolveDriveFolderCreateTarget', () => {
  it('maps All locations to My Drive root', () => {
    expect(resolveDriveFolderCreateTarget({ parentId: null, driveId: null })).toEqual({
      parentId: 'root',
      driveId: null,
      locationLabel: 'My Drive root',
    });
  });

  it('maps shared drive browse frame to shared drive root', () => {
    expect(
      resolveDriveFolderCreateTarget({
        parentId: 'root',
        driveId: 'drive-1',
        locationLabel: 'Ops Shared Drive',
      }),
    ).toEqual({
      parentId: 'root',
      driveId: 'drive-1',
      locationLabel: 'Ops Shared Drive root',
    });
  });

  it('maps nested folder frames to the current folder', () => {
    expect(
      resolveDriveFolderCreateTarget({
        parentId: 'folder-abc',
        driveId: 'drive-1',
        locationLabel: 'Exports',
      }),
    ).toEqual({
      parentId: 'folder-abc',
      driveId: 'drive-1',
      locationLabel: 'Exports',
    });
  });
});
