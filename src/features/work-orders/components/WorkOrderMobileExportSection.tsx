import React from 'react';
import { Button } from '@/components/ui/button';
import {
  ClipboardList,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { GoogleDriveExportRowConfig } from '@/features/work-orders/components/googleDriveExportRowTypes';
import { useWorkOrderGoogleDriveExportState } from '@/features/work-orders/hooks/useWorkOrderGoogleDriveExportState';
import {
  getGoogleDriveCreateAvailability,
  getGoogleDriveOpenAvailability,
  getGoogleDriveUpdateAvailability,
} from '@/features/work-orders/components/googleDriveExportPresentation';
import type { WorkOrderFileExportHandlers } from '@/features/work-orders/types/workOrderFileExportHandlers';

export interface WorkOrderMobileExportSectionProps extends WorkOrderFileExportHandlers {
  workOrderId: string;
  organizationId?: string;
  isManager: boolean;
  onAction: (action: () => void) => void;
  onOpenPdfDialog: () => void;
  onOpenDrivePdfDialog: () => void;
  isGeneratingPdf: boolean;
  onDownloadWorksheet: () => void;
  isGeneratingWorksheet: boolean;
}

interface GoogleDriveMobileRowProps extends GoogleDriveExportRowConfig {
  onAction: (action: () => void) => void;
}

function GoogleDriveMobileRow({
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
  onAction,
}: GoogleDriveMobileRowProps) {
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

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-11 flex-col gap-1 px-1"
          disabled={createAvailability.disabled}
          title={createAvailability.tooltip}
          onClick={() => onAction(onCreate)}
        >
          {isBusy && !hasLinkedArtifact ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            createIcon
          )}
          <span className="text-[10px] leading-tight">{createLabel}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-11 flex-col gap-1 px-1"
          disabled={updateAvailability.disabled}
          title={updateAvailability.tooltip}
          onClick={() => onAction(onUpdate)}
        >
          {isBusy && hasLinkedArtifact ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            updateIcon
          )}
          <span className="text-[10px] leading-tight">{updateLabel}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-11 flex-col gap-1 px-1"
          disabled={openAvailability.disabled}
          title={openAvailability.tooltip}
          onClick={() => {
            if (!webViewLink) return;
            window.open(webViewLink, '_blank', 'noopener,noreferrer');
            onAction(() => undefined);
          }}
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          <span className="text-[10px] leading-tight">{openLabel}</span>
        </Button>
      </div>
    </div>
  );
}

export function WorkOrderMobileExportSection({
  workOrderId,
  organizationId,
  isManager,
  onAction,
  onOpenPdfDialog,
  onOpenDrivePdfDialog,
  isGeneratingPdf,
  onDownloadXlsx,
  isExportingXlsx,
  onDownloadCsv,
  isExportingCsv,
  onDownloadDocx,
  isExportingDocx,
  docxDisabled = false,
  onDownloadWorksheet,
  isGeneratingWorksheet,
  onDriveDocs,
  isExportingToDocs,
  onDriveSheets,
  isExportingToSheets,
  isExportBusy,
}: WorkOrderMobileExportSectionProps) {
  const {
    canExportDocs,
    canExportPdf,
    canExportSheets,
    showGoogleDrive,
    docsDisplay,
    pdfDisplay,
    sheetsDisplay,
  } = useWorkOrderGoogleDriveExportState({ workOrderId, organizationId, isManager });

  if (!isManager) {
    return null;
  }

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Download</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-14 flex-col gap-1"
            disabled={docxDisabled || isExportingDocx || isExportBusy || !organizationId}
            onClick={() => onAction(onDownloadDocx)}
          >
            {isExportingDocx ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <FileText className="h-5 w-5" aria-hidden />
            )}
            <span className="text-xs">DOCX</span>
          </Button>
          <Button
            variant="outline"
            className="h-14 flex-col gap-1"
            disabled={isGeneratingPdf || isExportBusy}
            onClick={() => onAction(onOpenPdfDialog)}
          >
            {isGeneratingPdf ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Download className="h-5 w-5" aria-hidden />
            )}
            <span className="text-xs">PDF</span>
          </Button>
          <Button
            variant="outline"
            className="h-14 flex-col gap-1"
            disabled={isExportingXlsx || isExportBusy || !organizationId}
            onClick={() => onAction(onDownloadXlsx)}
          >
            {isExportingXlsx ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <FileSpreadsheet className="h-5 w-5" aria-hidden />
            )}
            <span className="text-xs">XLSX</span>
          </Button>
          <Button
            variant="outline"
            className="h-14 flex-col gap-1"
            disabled={isExportingCsv || isExportBusy || !organizationId}
            onClick={() => onAction(onDownloadCsv)}
          >
            {isExportingCsv ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Download className="h-5 w-5" aria-hidden />
            )}
            <span className="text-xs">CSV</span>
          </Button>
          <Button
            variant="outline"
            className="col-span-2 h-12 justify-start gap-2"
            disabled={isGeneratingWorksheet}
            onClick={() => onAction(onDownloadWorksheet)}
          >
            {isGeneratingWorksheet ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <ClipboardList className="h-5 w-5" aria-hidden />
            )}
            <span className="text-sm font-medium">Field Worksheet</span>
          </Button>
        </div>
      </div>

      {showGoogleDrive ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Google Drive</p>
          <div className="space-y-2">
            <GoogleDriveMobileRow
              label="Docs"
              createLabel="Create"
              updateLabel="Update"
              openLabel="Open"
              canExport={canExportDocs}
              isBusy={isExportingToDocs}
              hasLinkedArtifact={docsDisplay.hasLinkedArtifact}
              webViewLink={docsDisplay.webViewLink}
              createIcon={<FileText className="h-4 w-4" aria-hidden />}
              updateIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
              onCreate={onDriveDocs}
              onUpdate={onDriveDocs}
              onAction={onAction}
            />
            <GoogleDriveMobileRow
              label="PDF"
              createLabel="Save"
              updateLabel="Update"
              openLabel="Open"
              canExport={canExportPdf}
              isBusy={isGeneratingPdf}
              hasLinkedArtifact={pdfDisplay.hasLinkedArtifact}
              webViewLink={pdfDisplay.webViewLink}
              createIcon={<Download className="h-4 w-4" aria-hidden />}
              updateIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
              onCreate={onOpenDrivePdfDialog}
              onUpdate={onOpenDrivePdfDialog}
              onAction={onAction}
            />
            <GoogleDriveMobileRow
              label="Sheets"
              createLabel="Create"
              updateLabel="Update"
              openLabel="Open"
              canExport={canExportSheets}
              isBusy={isExportingToSheets}
              hasLinkedArtifact={sheetsDisplay.hasLinkedArtifact}
              webViewLink={sheetsDisplay.webViewLink}
              createIcon={<FileSpreadsheet className="h-4 w-4" aria-hidden />}
              updateIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
              onCreate={onDriveSheets}
              onUpdate={onDriveSheets}
              onAction={onAction}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
