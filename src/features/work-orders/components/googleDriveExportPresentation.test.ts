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
      provider_file_id: 'file-1',
      web_view_link: 'https://docs.google.com/document/d/file-1/edit',
    });

    expect(display.hasLinkedArtifact).toBe(true);
    expect(display.webViewLink).toBe('https://docs.google.com/document/d/file-1/edit');
  });

  it('returns a null web view link when no artifact is linked', () => {
    const display = getGoogleDriveArtifactDisplay(null);

    expect(display.hasLinkedArtifact).toBe(false);
    expect(display.webViewLink).toBeNull();
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
