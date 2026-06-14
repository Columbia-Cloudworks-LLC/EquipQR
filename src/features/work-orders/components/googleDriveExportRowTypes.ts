import type React from 'react';

export interface GoogleDriveExportRowConfig {
  label: string;
  createLabel: string;
  updateLabel: string;
  openLabel: string;
  canExport: boolean;
  isBusy: boolean;
  hasLinkedArtifact: boolean;
  webViewLink: string | null;
  createIcon: React.ReactNode;
  updateIcon: React.ReactNode;
  onCreate: () => void;
  onUpdate: () => void;
}
