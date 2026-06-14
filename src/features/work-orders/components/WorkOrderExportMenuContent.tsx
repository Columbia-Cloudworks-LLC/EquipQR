import React from 'react';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Trash2,
} from 'lucide-react';
import { WorkOrderQuickBooksExportSubmenu } from '@/features/work-orders/components/WorkOrderQuickBooksExportSubmenu';
import { WorkOrderGoogleDriveExportSubmenu } from '@/features/work-orders/components/WorkOrderGoogleDriveExportSubmenu';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';

export interface WorkOrderExportMenuContentProps {
  workOrderId: string;
  workOrderStatus: WorkOrderStatus;
  equipmentTeamId?: string | null;
  showExports: boolean;
  showQuickBooks: boolean;
  showGoogleDrive: boolean;
  canDelete: boolean;
  organizationId?: string;
  isManager: boolean;
  onOpenPdfDialog: () => void;
  onOpenDrivePdfDialog: () => void;
  isGeneratingPdf: boolean;
  onDownloadXlsx: () => void;
  isExportingXlsx: boolean;
  onDownloadCsv: () => void;
  isExportingCsv: boolean;
  onDownloadDocx: () => void;
  isExportingDocx: boolean;
  docxDisabled?: boolean;
  onDriveDocs: () => void;
  isExportingToDocs: boolean;
  onDriveSheets: () => void;
  isExportingToSheets: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  isExportBusy: boolean;
}

export const WorkOrderExportMenuContent: React.FC<WorkOrderExportMenuContentProps> = ({
  workOrderId,
  workOrderStatus,
  equipmentTeamId,
  showExports,
  showQuickBooks,
  showGoogleDrive,
  canDelete,
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
  onDelete,
  isDeleting,
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

      {canDelete && (
        <>
          {(showExports || showQuickBooks) && <DropdownMenuSeparator />}
          <DropdownMenuItem
            onClick={onDelete}
            disabled={isDeleting}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Work Order
          </DropdownMenuItem>
        </>
      )}
    </>
  );
};
