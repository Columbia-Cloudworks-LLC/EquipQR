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
import type { GoogleDriveExportRowConfig } from '@/features/work-orders/components/googleDriveExportRowTypes';
import { useWorkOrderGoogleDriveExportState } from '@/features/work-orders/hooks/useWorkOrderGoogleDriveExportState';
import {
  getGoogleDriveCreateAvailability,
  getGoogleDriveOpenAvailability,
  getGoogleDriveUpdateAvailability,
} from '@/features/work-orders/components/googleDriveExportPresentation';

interface GoogleDriveFormatSubmenuProps extends GoogleDriveExportRowConfig {
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
  const {
    isConnected,
    hasDestination,
    organizationId: orgId,
    canExportDocs,
    canExportPdf,
    canExportSheets,
    docsDisplay,
    pdfDisplay,
    sheetsDisplay,
  } = useWorkOrderGoogleDriveExportState({ workOrderId, organizationId, isManager });

  if (!isConnected || !hasDestination || !orgId) {
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
