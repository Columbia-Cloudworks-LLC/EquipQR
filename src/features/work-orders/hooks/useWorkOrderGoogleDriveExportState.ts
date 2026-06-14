import { useGoogleWorkspaceConnectionStatus } from '@/features/organization/hooks/useGoogleWorkspaceConnectionStatus';
import { useGoogleWorkspaceExportDestination } from '@/features/organization/hooks/useGoogleWorkspaceExportDestination';
import { useLatestExportArtifact } from '@/features/work-orders/hooks/useLatestExportArtifact';
import {
  GOOGLE_DRIVE_ARTIFACT_KINDS,
  GOOGLE_DRIVE_EXPORT_CHANNELS,
} from '@/features/work-orders/constants/googleDriveExportArtifacts';
import {
  canExportWorkOrderGoogleDoc,
  canExportWorkOrderGooglePdf,
  canExportWorkOrderGoogleSheets,
} from '@/features/work-orders/utils/googleDriveExportAvailability';
import { getGoogleDriveArtifactDisplay } from '@/features/work-orders/components/googleDriveExportPresentation';

interface UseWorkOrderGoogleDriveExportStateArgs {
  workOrderId: string;
  organizationId?: string;
  isManager: boolean;
}

export function useWorkOrderGoogleDriveExportState({
  workOrderId,
  organizationId,
  isManager,
}: UseWorkOrderGoogleDriveExportStateArgs) {
  const { isConnected, connectionStatus } = useGoogleWorkspaceConnectionStatus({ organizationId });
  const { destination } = useGoogleWorkspaceExportDestination(organizationId, isManager);
  const hasDestination = Boolean(destination);

  const availabilityOptions = {
    isConnected,
    scopes: connectionStatus?.scopes,
    hasDestination,
  };

  const canExportDocs = canExportWorkOrderGoogleDoc(availabilityOptions);
  const canExportPdf = canExportWorkOrderGooglePdf(availabilityOptions);
  const canExportSheets = canExportWorkOrderGoogleSheets(availabilityOptions);
  const showGoogleDrive = isConnected && hasDestination && Boolean(organizationId);

  const { data: docsArtifact } = useLatestExportArtifact(
    organizationId,
    workOrderId,
    GOOGLE_DRIVE_EXPORT_CHANNELS.DOCS,
    GOOGLE_DRIVE_ARTIFACT_KINDS.INTERNAL_PACKET,
    Boolean(organizationId),
  );
  const { data: pdfArtifact } = useLatestExportArtifact(
    organizationId,
    workOrderId,
    GOOGLE_DRIVE_EXPORT_CHANNELS.PDF,
    GOOGLE_DRIVE_ARTIFACT_KINDS.SERVICE_REPORT_PDF,
    Boolean(organizationId),
  );
  const { data: sheetsArtifact } = useLatestExportArtifact(
    organizationId,
    workOrderId,
    GOOGLE_DRIVE_EXPORT_CHANNELS.SHEETS,
    GOOGLE_DRIVE_ARTIFACT_KINDS.INTERNAL_PACKET,
    Boolean(organizationId),
  );

  const docsDisplay = getGoogleDriveArtifactDisplay(docsArtifact);
  const pdfDisplay = getGoogleDriveArtifactDisplay(pdfArtifact);
  const sheetsDisplay = getGoogleDriveArtifactDisplay(sheetsArtifact);

  return {
    isConnected,
    hasDestination,
    organizationId,
    canExportDocs,
    canExportPdf,
    canExportSheets,
    showGoogleDrive,
    docsDisplay,
    pdfDisplay,
    sheetsDisplay,
  };
}
