export const GOOGLE_DRIVE_EXPORT_FOLDER_PREVIEW = {
  exampleTeamName: 'Field Service',
  exampleEquipmentName: 'CAT 320 Excavator',
  exampleFileName: 'Work Order Packet',
} as const;

export type GoogleDriveExportFolderPreviewSegmentKind = 'root' | 'team' | 'equipment' | 'file';

export type GoogleDriveExportFolderPreviewSegment = {
  name: string;
  depth: number;
  kind: GoogleDriveExportFolderPreviewSegmentKind;
};

export type GoogleDriveExportFolderPreviewInput = {
  rootFolderName: string;
  folderByTeam: boolean;
  folderByEquipment: boolean;
  exampleTeamName?: string;
  exampleEquipmentName?: string;
  exampleFileName?: string;
};

export function buildGoogleDriveExportFolderPreview(
  input: GoogleDriveExportFolderPreviewInput,
): GoogleDriveExportFolderPreviewSegment[] {
  const {
    rootFolderName,
    folderByTeam,
    folderByEquipment,
    exampleTeamName = GOOGLE_DRIVE_EXPORT_FOLDER_PREVIEW.exampleTeamName,
    exampleEquipmentName = GOOGLE_DRIVE_EXPORT_FOLDER_PREVIEW.exampleEquipmentName,
    exampleFileName = GOOGLE_DRIVE_EXPORT_FOLDER_PREVIEW.exampleFileName,
  } = input;

  const segments: GoogleDriveExportFolderPreviewSegment[] = [
    { name: rootFolderName, depth: 0, kind: 'root' },
  ];

  let depth = 1;

  if (folderByTeam) {
    segments.push({ name: exampleTeamName, depth, kind: 'team' });
    depth += 1;
  }

  if (folderByEquipment) {
    segments.push({ name: exampleEquipmentName, depth, kind: 'equipment' });
    depth += 1;
  }

  segments.push({ name: exampleFileName, depth, kind: 'file' });

  return segments;
}

export function formatGoogleDriveExportFolderPath(
  segments: GoogleDriveExportFolderPreviewSegment[],
): string {
  return segments.map((segment) => segment.name).join(' / ');
}

export function getGoogleDriveExportFolderRoutingSummary(input: {
  folderByTeam: boolean;
  folderByEquipment: boolean;
}): string {
  if (input.folderByTeam && input.folderByEquipment) {
    return 'Exports are grouped by team, then by equipment.';
  }

  if (input.folderByTeam) {
    return 'Exports are grouped by team only.';
  }

  if (input.folderByEquipment) {
    return 'Exports are grouped by equipment only.';
  }

  return 'Exports save directly in your organization folder with no subfolders.';
}
