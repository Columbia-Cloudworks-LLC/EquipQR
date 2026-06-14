import type { RecordExportArtifact } from '@/services/google-workspace/recordExportArtifactsService';

export type ExportArtifactLike = Pick<
  RecordExportArtifact,
  'provider_file_id' | 'web_view_link'
> | null | undefined;

export function getGoogleDriveArtifactDisplay(artifact: ExportArtifactLike) {
  const hasLinkedArtifact = Boolean(artifact?.provider_file_id && artifact?.web_view_link);
  return {
    hasLinkedArtifact,
    webViewLink: hasLinkedArtifact ? artifact!.web_view_link : null,
  };
}

export interface GoogleDriveExportActionAvailabilityInput {
  canExport: boolean;
  isBusy: boolean;
  hasLinkedArtifact: boolean;
}

export function getGoogleDriveCreateAvailability({
  canExport,
  isBusy,
  hasLinkedArtifact,
}: GoogleDriveExportActionAvailabilityInput) {
  if (hasLinkedArtifact) {
    return {
      disabled: true,
      tooltip: 'A file is already linked to this work order. Use Update instead.',
    };
  }

  if (!canExport) {
    return {
      disabled: true,
      tooltip:
        'Google Workspace export is unavailable. Connect Google Workspace, grant export permissions, and set an organization Drive folder in Organization Settings.',
    };
  }

  if (isBusy) {
    return {
      disabled: true,
      tooltip: 'Export in progress…',
    };
  }

  return {
    disabled: false,
    tooltip: 'Create a new file in your organization Drive folder.',
  };
}

export function getGoogleDriveUpdateAvailability({
  canExport,
  isBusy,
  hasLinkedArtifact,
}: GoogleDriveExportActionAvailabilityInput) {
  if (!hasLinkedArtifact) {
    return {
      disabled: true,
      tooltip: 'Create a file first before updating.',
    };
  }

  if (!canExport) {
    return {
      disabled: true,
      tooltip:
        'Google Workspace export is unavailable. Connect Google Workspace, grant export permissions, and set an organization Drive folder in Organization Settings.',
    };
  }

  if (isBusy) {
    return {
      disabled: true,
      tooltip: 'Export in progress…',
    };
  }

  return {
    disabled: false,
    tooltip: 'Replace the linked file with the latest work order data.',
  };
}

export function getGoogleDriveOpenAvailability(hasLinkedArtifact: boolean, label: string) {
  if (!hasLinkedArtifact) {
    return {
      disabled: true,
      tooltip: `Create a ${label} first to open it in Google Drive.`,
    };
  }

  return {
    disabled: false,
    tooltip: `Open the linked ${label} in Google Drive.`,
  };
}
