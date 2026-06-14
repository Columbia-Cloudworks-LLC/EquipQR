import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CheckCircle } from 'lucide-react';
import { WorkOrderPDFExportDialog } from '@/features/work-orders/components/WorkOrderPDFExportDialog';
import { MobileWorkOrderActionSheet } from '@/features/work-orders/components/MobileWorkOrderActionSheet';
import { MobileWorkOrderActionFooter } from '@/features/work-orders/components/MobileWorkOrderActionFooter';
import WorkOrderAcceptanceModal from '@/features/work-orders/components/WorkOrderAcceptanceModal';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import type { WorkOrderLike } from '@/features/work-orders/utils/workOrderTypeConversion';
import type { UseMutationResult } from '@tanstack/react-query';

type WorkOrderDetailsOverlaysProps = {
  isMobile: boolean;
  workOrder: WorkOrder;
  organizationId: string;
  equipmentTeamId?: string | null;
  permissionLevels: {
    isManager: boolean;
  };
  canAddNotes: boolean;
  canCompletePmGate: boolean;
  showMobileActionFooter: boolean;
  syncState: ReturnType<typeof import('@/features/work-orders/utils/workOrderDetailsViewModel').buildOfflineSyncState>;
  workTimer: {
    displayTime: string;
    elapsedSeconds: number;
    isRunning: boolean;
    start: () => void;
    pause: () => void;
  };
  showMobilePDFDialog: boolean;
  onMobilePDFDialogOpenChange: (open: boolean) => void;
  mobilePdfDialogFocusDrive: boolean;
  onOpenMobilePdfDialog: () => void;
  onOpenMobileDrivePdfDialog: () => void;
  onMobilePDFExport: (options: { includeCosts: boolean }) => Promise<void>;
  isMobilePDFGenerating: boolean;
  isGoogleWorkspaceConnected: boolean;
  googleDocsDestination: unknown;
  onMobileSaveToDrive: (options: { includeCosts: boolean }) => Promise<void>;
  isMobileSavingToDrive: boolean;
  showMobileActionSheet: boolean;
  onMobileActionSheetOpenChange: (open: boolean) => void;
  onViewFullDetails: () => void;
  onDownloadWorksheet: () => Promise<void>;
  isMobileWorksheetGenerating: boolean;
  onDownloadXlsx: () => void;
  isExportingXlsx: boolean;
  onDownloadCsv: () => void;
  isExportingCsv: boolean;
  onDownloadDocx: () => void;
  isExportingDocx: boolean;
  docxDisabled: boolean;
  onDriveDocs: () => void;
  isExportingToDocs: boolean;
  onDriveSheets: () => void;
  isExportingToSheets: boolean;
  isExportBusy: boolean;
  showMobileCompleteDialog: boolean;
  onMobileCompleteDialogOpenChange: (open: boolean) => void;
  mobileStatusMutation: Pick<UseMutationResult<unknown, unknown, unknown, unknown>, 'isPending'>;
  onCompleteMobileWorkOrder: () => void;
  showFieldAcceptDialog: boolean;
  onFieldAcceptDialogClose: () => void;
  onFieldAcceptComplete: () => void;
  fieldAcceptanceMutation: Pick<UseMutationResult<unknown, unknown, unknown, unknown>, 'isPending'>;
  onOpenNotesComposer: () => void;
  onOpenPhotoCapture: () => void;
  onStartMobileWorkOrder: () => void;
  onPutAssignedMobileWorkOrderOnHold: () => void;
  onPauseResumeMobileWorkOrder: () => void;
  onOpenCompleteDialog: () => void;
  onScrollToChecklist: () => void;
  onRequestAccept: () => void;
  onRetrySync: () => void;
};

export function WorkOrderDetailsOverlays({
  isMobile,
  workOrder,
  organizationId,
  equipmentTeamId,
  permissionLevels,
  canAddNotes,
  canCompletePmGate,
  showMobileActionFooter,
  syncState,
  workTimer,
  showMobilePDFDialog,
  onMobilePDFDialogOpenChange,
  mobilePdfDialogFocusDrive,
  onOpenMobilePdfDialog,
  onOpenMobileDrivePdfDialog,
  onMobilePDFExport,
  isMobilePDFGenerating,
  isGoogleWorkspaceConnected,
  googleDocsDestination,
  onMobileSaveToDrive,
  isMobileSavingToDrive,
  showMobileActionSheet,
  onMobileActionSheetOpenChange,
  onViewFullDetails,
  onDownloadWorksheet,
  isMobileWorksheetGenerating,
  onDownloadXlsx,
  isExportingXlsx,
  onDownloadCsv,
  isExportingCsv,
  onDownloadDocx,
  isExportingDocx,
  docxDisabled,
  onDriveDocs,
  isExportingToDocs,
  onDriveSheets,
  isExportingToSheets,
  isExportBusy,
  showMobileCompleteDialog,
  onMobileCompleteDialogOpenChange,
  mobileStatusMutation,
  onCompleteMobileWorkOrder,
  showFieldAcceptDialog,
  onFieldAcceptDialogClose,
  onFieldAcceptComplete,
  fieldAcceptanceMutation,
  onOpenNotesComposer,
  onOpenPhotoCapture,
  onStartMobileWorkOrder,
  onPutAssignedMobileWorkOrderOnHold,
  onPauseResumeMobileWorkOrder,
  onOpenCompleteDialog,
  onScrollToChecklist,
  onRequestAccept,
  onRetrySync,
}: WorkOrderDetailsOverlaysProps) {
  return (
    <>
      <WorkOrderPDFExportDialog
        open={showMobilePDFDialog}
        onOpenChange={onMobilePDFDialogOpenChange}
        onExport={onMobilePDFExport}
        isExporting={isMobilePDFGenerating}
        showCostsOption={permissionLevels.isManager}
        isGoogleWorkspaceConnected={isGoogleWorkspaceConnected}
        hasOrganizationDriveDestination={Boolean(googleDocsDestination)}
        onSaveToDrive={onMobileSaveToDrive}
        isSavingToDrive={isMobileSavingToDrive}
        focusDriveAction={mobilePdfDialogFocusDrive}
      />

      {isMobile && (
        <MobileWorkOrderActionSheet
          open={showMobileActionSheet}
          onOpenChange={onMobileActionSheetOpenChange}
          workOrderId={workOrder.id}
          workOrderStatus={workOrder.status}
          equipmentTeamId={equipmentTeamId}
          organizationId={organizationId}
          isManager={permissionLevels.isManager}
          onViewFullDetails={onViewFullDetails}
          onOpenPdfDialog={onOpenMobilePdfDialog}
          onOpenDrivePdfDialog={onOpenMobileDrivePdfDialog}
          isGeneratingPdf={isMobilePDFGenerating}
          onDownloadWorksheet={onDownloadWorksheet}
          isGeneratingWorksheet={isMobileWorksheetGenerating}
          onDownloadXlsx={onDownloadXlsx}
          isExportingXlsx={isExportingXlsx}
          onDownloadCsv={onDownloadCsv}
          isExportingCsv={isExportingCsv}
          onDownloadDocx={onDownloadDocx}
          isExportingDocx={isExportingDocx}
          docxDisabled={docxDisabled}
          onDriveDocs={onDriveDocs}
          isExportingToDocs={isExportingToDocs}
          onDriveSheets={onDriveSheets}
          isExportingToSheets={isExportingToSheets}
          isExportBusy={isExportBusy}
        />
      )}

      <AlertDialog open={showMobileCompleteDialog} onOpenChange={onMobileCompleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Complete Work Order
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Are you sure you want to mark this work order as completed?</p>
                {workTimer.elapsedSeconds > 0 && (
                  <p className="text-sm">
                    Timer: <span className="font-medium text-foreground">{workTimer.displayTime}</span> ({(workTimer.elapsedSeconds / 3600).toFixed(2)}h)
                  </p>
                )}
                <p className="text-sm font-medium text-foreground">Before completing, please confirm:</p>
                <ul className="text-sm space-y-1 list-disc pl-4">
                  <li>All hours have been logged</li>
                  <li>All cost items have been recorded</li>
                  <li>Notes and photos are up to date</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mobileStatusMutation.isPending}>
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={mobileStatusMutation.isPending}
              onClick={onCompleteMobileWorkOrder}
            >
              {mobileStatusMutation.isPending ? 'Completing...' : 'Mark as Complete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WorkOrderAcceptanceModal
        open={showFieldAcceptDialog}
        onClose={onFieldAcceptDialogClose}
        workOrder={workOrder as unknown as WorkOrderLike}
        organizationId={organizationId}
        onAccept={onFieldAcceptComplete}
      />

      {showMobileActionFooter && (
        <MobileWorkOrderActionFooter
          workOrder={{
            id: workOrder.id,
            status: workOrder.status,
            has_pm: workOrder.has_pm,
            assignee_id: workOrder.assignee_id,
            created_by: workOrder.created_by,
          }}
          organizationId={organizationId}
          canCompletePm={canCompletePmGate}
          canAddNotes={canAddNotes}
          isUpdatingStatusExternal={mobileStatusMutation.isPending || fieldAcceptanceMutation.isPending}
          syncState={syncState}
          timerDisplay={workTimer.displayTime}
          isTimerRunning={workTimer.isRunning}
          onToggleTimer={() => {
            if (workTimer.isRunning) {
              workTimer.pause();
            } else {
              workTimer.start();
            }
          }}
          onAddNote={onOpenNotesComposer}
          onAddPhoto={onOpenPhotoCapture}
          onStartWork={onStartMobileWorkOrder}
          onAssignedPutOnHold={onPutAssignedMobileWorkOrderOnHold}
          onPauseResume={onPauseResumeMobileWorkOrder}
          onOpenCompleteDialog={onOpenCompleteDialog}
          onScrollToChecklist={onScrollToChecklist}
          onRequestAccept={onRequestAccept}
          onRetrySync={onRetrySync}
        />
      )}
    </>
  );
}
