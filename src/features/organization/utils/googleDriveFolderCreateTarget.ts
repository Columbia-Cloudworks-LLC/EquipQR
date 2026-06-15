export function resolveDriveFolderCreateTarget(input: {
  parentId: string | null;
  driveId: string | null;
  locationLabel?: string | null;
}): {
  parentId: string;
  driveId: string | null;
  locationLabel: string;
} {
  if (input.parentId === null && input.driveId === null) {
    return {
      parentId: 'root',
      driveId: null,
      locationLabel: 'My Drive root',
    };
  }

  if (input.parentId === 'root' && input.driveId) {
    return {
      parentId: 'root',
      driveId: input.driveId,
      locationLabel: input.locationLabel ? `${input.locationLabel} root` : 'Shared Drive root',
    };
  }

  return {
    parentId: input.parentId ?? 'root',
    driveId: input.driveId,
    locationLabel: input.locationLabel ?? 'this folder',
  };
}
