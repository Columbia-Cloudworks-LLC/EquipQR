import { describe, expect, it } from 'vitest';
import {
  getGoogleDriveArtifactDisplay,
  getGoogleDriveCreateAvailability,
  getGoogleDriveOpenAvailability,
  getGoogleDriveUpdateAvailability,
} from '@/features/work-orders/components/googleDriveExportPresentation';

describe('googleDriveExportPresentation', () => {
  it('detects linked artifacts with provider id and web view link', () => {
    const display = getGoogleDriveArtifactDisplay({
      id: 'artifact-1',
      provider_file_id: 'file-1',
      web_view_link: 'https://docs.google.com/document/d/file-1/edit',
      last_exported_at: '2026-06-13T00:00:00.000Z',
      status: 'current',
    });

    expect(display.hasLinkedArtifact).toBe(true);
    expect(display.webViewLink).toBe('https://docs.google.com/document/d/file-1/edit');
  });

  it('disables create when an artifact is already linked', () => {
    const availability = getGoogleDriveCreateAvailability({
      canExport: true,
      isBusy: false,
      hasLinkedArtifact: true,
    });

    expect(availability.disabled).toBe(true);
    expect(availability.tooltip).toContain('Update');
  });

  it('disables update and enables open based on linkage', () => {
    const updateAvailability = getGoogleDriveUpdateAvailability({
      canExport: true,
      isBusy: false,
      hasLinkedArtifact: false,
    });
    const openAvailability = getGoogleDriveOpenAvailability(false, 'google doc');

    expect(updateAvailability.disabled).toBe(true);
    expect(openAvailability.disabled).toBe(true);
  });
});
