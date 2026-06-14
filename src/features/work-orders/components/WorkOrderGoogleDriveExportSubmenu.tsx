import React from 'react';
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Download, ExternalLink, FileSpreadsheet, FileText, Loader2, RefreshCw } from 'lucide-react';
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
import {
  getGoogleDriveArtifactDisplay,
  getGoogleDriveCreateAvailability,
  getGoogleDriveOpenAvailability,
  getGoogleDriveUpdateAvailability,
} from '@/features/work-orders/components/googleDriveExportPresentation';

interface GoogleDriveFormatSubmenuProps {
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
  /** Defer actions until after nested dropdown closes (required for dialog open from PDF submenu). */
  deferActions?: boolean;
}

function runDeferredAction(action: () => void, defer: boolean): void {
  if (defer) {
    window.setTimeout(action, 0);
    return;
  }
  action();
}

function GoogleDriveFormatSubmenu({
  label,
  createLabel,
  updateLabel,
  openLabel,
  canExport,
  isBusy,
  hasLinkedArtifact,
  webViewLink,
  createIcon,
  updateIcon,
  onCreate,
  onUpdate,
  deferActions = false,
}: GoogleDriveFormatSubmenuProps) {
  const createAvailability = getGoogleDriveCreateAvailability({
    canExport,
    isBusy,
    hasLinkedArtifact,
  });
  const updateAvailability = getGoogleDriveUpdateAvailability({
    canExport,
    isBusy,
    hasLinkedArtifact,
  });
  const openAvailability = getGoogleDriveOpenAvailability(hasLinkedArtifact, label.toLowerCase());

  const handleOpen = () => {
    if (!webViewLink) return;
    window.open(webViewLink, '_blank', 'noopener,noreferrer');
  };

  const handleCreateSelect = (event: Event) => {
    if (deferActions) {
      event.preventDefault();
    }
    runDeferredAction(onCreate, deferActions);
  };

  const handleUpdateSelect = (event: Event) => {
    if (deferActions) {
      event.preventDefault();
    }
    runDeferredAction(onUpdate, deferActions);
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>{label}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                onSelect={handleCreateSelect}
                disabled={createAvailability.disabled}
              >
                {isBusy && !hasLinkedArtifact ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  createIcon
                )}
                {createLabel}
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="max-w-xs">{createAvailability.tooltip}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                onSelect={handleUpdateSelect}
                disabled={updateAvailability.disabled}
              >
                {isBusy && hasLinkedArtifact ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  updateIcon
                )}
                {updateLabel}
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="max-w-xs">{updateAvailability.tooltip}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem onClick={handleOpen} disabled={openAvailability.disabled}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {openLabel}
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="max-w-xs">{openAvailability.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

export interface WorkOrderGoogleDriveExportSubmenuProps {
  workOrderId: string;
  organizationId?: string;
  isManager: boolean;
  onOpenPdfDialog: () => void;
  isPdfBusy: boolean;
  onExportDocs: () => void;
  isExportingDocs: boolean;
  onExportSheets: () => void;
  isExportingSheets: boolean;
}

export const WorkOrderGoogleDriveExportSubmenu: React.FC<WorkOrderGoogleDriveExportSubmenuProps> = ({
  workOrderId,
  organizationId,
  isManager,
  onOpenPdfDialog,
  isPdfBusy,
  onExportDocs,
  isExportingDocs,
  onExportSheets,
  isExportingSheets,
}) => {
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

  if (!isConnected || !hasDestination || !organizationId) {
    return null;
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>Google Drive</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <GoogleDriveFormatSubmenu
          label="Docs"
          createLabel="Create Google Doc"
          updateLabel="Update Google Doc"
          openLabel="Open Google Doc"
          canExport={canExportDocs}
          isBusy={isExportingDocs}
          hasLinkedArtifact={docsDisplay.hasLinkedArtifact}
          webViewLink={docsDisplay.webViewLink}
          createIcon={<FileText className="h-4 w-4 mr-2" />}
          updateIcon={<RefreshCw className="h-4 w-4 mr-2" />}
          onCreate={onExportDocs}
          onUpdate={onExportDocs}
        />

        <GoogleDriveFormatSubmenu
          label="PDF"
          createLabel="Save to Drive"
          updateLabel="Update on Drive"
          openLabel="Open PDF"
          canExport={canExportPdf}
          isBusy={isPdfBusy}
          hasLinkedArtifact={pdfDisplay.hasLinkedArtifact}
          webViewLink={pdfDisplay.webViewLink}
          createIcon={<Download className="h-4 w-4 mr-2" />}
          updateIcon={<RefreshCw className="h-4 w-4 mr-2" />}
          onCreate={onOpenPdfDialog}
          onUpdate={onOpenPdfDialog}
          deferActions
        />

        <GoogleDriveFormatSubmenu
          label="Sheets"
          createLabel="Create Google Sheet"
          updateLabel="Update Google Sheet"
          openLabel="Open Google Sheet"
          canExport={canExportSheets}
          isBusy={isExportingSheets}
          hasLinkedArtifact={sheetsDisplay.hasLinkedArtifact}
          webViewLink={sheetsDisplay.webViewLink}
          createIcon={<FileSpreadsheet className="h-4 w-4 mr-2" />}
          updateIcon={<RefreshCw className="h-4 w-4 mr-2" />}
          onCreate={onExportSheets}
          onUpdate={onExportSheets}
        />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
