import React from 'react';
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from 'lucide-react';
import { WorkOrderQuickBooksExportSubmenu } from './WorkOrderQuickBooksExportSubmenu';
import { WorkOrderGoogleDriveExportSubmenu } from './WorkOrderGoogleDriveExportSubmenu';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import type { WorkOrderFileExportHandlers } from '@/features/work-orders/types/workOrderFileExportHandlers';

export interface WorkOrderExportMenuContentProps extends WorkOrderFileExportHandlers {
  workOrderId: string;
  workOrderStatus: WorkOrderStatus;
  equipmentTeamId?: string | null;
  showExports: boolean;
  showQuickBooks: boolean;
  showGoogleDrive: boolean;
  organizationId?: string;
  isManager: boolean;
  onOpenPdfDialog: () => void;
  onOpenDrivePdfDialog: () => void;
  isGeneratingPdf: boolean;
}

export const WorkOrderExportMenuContent: React.FC<WorkOrderExportMenuContentProps> = ({
  workOrderId,
  workOrderStatus,
  equipmentTeamId,
  showExports,
  showQuickBooks,
  showGoogleDrive,
  organizationId,
  isManager,
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
  onDriveDocs,
  isExportingToDocs,
  onDriveSheets,
  isExportingToSheets,
  isExportBusy,
}) => {
  return (
    <>
      {showExports && (
        <>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Download</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={onDownloadDocx}
                disabled={docxDisabled || isExportingDocx || isExportBusy || !organizationId}
              >
                {isExportingDocx ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                DOCX
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onOpenPdfDialog}
                disabled={isGeneratingPdf || isExportBusy}
              >
                {isGeneratingPdf ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDownloadXlsx}
                disabled={isExportingXlsx || isExportBusy || !organizationId}
              >
                {isExportingXlsx ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                XLSX
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDownloadCsv}
                disabled={isExportingCsv || isExportBusy || !organizationId}
              >
                {isExportingCsv ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                CSV
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {showGoogleDrive && (
            <WorkOrderGoogleDriveExportSubmenu
              workOrderId={workOrderId}
              organizationId={organizationId}
              isManager={isManager}
              onOpenPdfDialog={onOpenDrivePdfDialog}
              isPdfBusy={isGeneratingPdf}
              onExportDocs={onDriveDocs}
              isExportingDocs={isExportingToDocs}
              onExportSheets={onDriveSheets}
              isExportingSheets={isExportingToSheets}
            />
          )}
        </>
      )}

      {showQuickBooks && (
        <WorkOrderQuickBooksExportSubmenu
          workOrderId={workOrderId}
          teamId={equipmentTeamId ?? null}
          workOrderStatus={workOrderStatus}
        />
      )}
    </>
  );
};
