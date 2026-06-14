import {
  hasAllGoogleScopes,
} from '@/services/google-workspace/auth';
import { canExportWorkOrderGoogleDoc } from '@/features/work-orders/utils/googleDocsExportAvailability';

interface GoogleDriveExportBaseOptions {
  isConnected: boolean;
  scopes: string | null | undefined;
  hasDestination: boolean;
}

export function canExportWorkOrderGoogleDriveBase({
  isConnected,
  scopes,
  hasDestination,
}: GoogleDriveExportBaseOptions): boolean {
  return (
    isConnected &&
    hasDestination &&
    hasAllGoogleScopes(scopes, [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly',
    ])
  );
}

export function canExportWorkOrderGoogleSheets(options: GoogleDriveExportBaseOptions): boolean {
  return (
    canExportWorkOrderGoogleDriveBase(options) &&
    hasAllGoogleScopes(options.scopes, ['https://www.googleapis.com/auth/spreadsheets'])
  );
}

export function canExportWorkOrderGooglePdf(options: GoogleDriveExportBaseOptions): boolean {
  return (
    options.isConnected &&
    options.hasDestination &&
    hasAllGoogleScopes(options.scopes, ['https://www.googleapis.com/auth/drive.file'])
  );
}

export { canExportWorkOrderGoogleDoc };
