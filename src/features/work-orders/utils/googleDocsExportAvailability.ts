import {
  GOOGLE_EXPORT_DESTINATION_REQUIRED_SCOPES,
  hasAllGoogleScopes,
} from '@/services/google-workspace/auth';

interface GoogleDocsExportAvailabilityOptions {
  isConnected: boolean;
  scopes: string | null | undefined;
  hasDestination: boolean;
}

export function canExportWorkOrderGoogleDoc({
  isConnected,
  scopes,
  hasDestination,
}: GoogleDocsExportAvailabilityOptions): boolean {
  return (
    isConnected &&
    hasDestination &&
    hasAllGoogleScopes(scopes, GOOGLE_EXPORT_DESTINATION_REQUIRED_SCOPES)
  );
}
