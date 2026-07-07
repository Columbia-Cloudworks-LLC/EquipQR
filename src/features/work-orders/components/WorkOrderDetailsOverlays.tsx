import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkOrderPDFExportDialog } from '@/features/work-orders/components/WorkOrderPDFExportDialog';
import { MobileWorkOrderActionSheet } from '@/features/work-orders/components/MobileWorkOrderActionSheet';
import { MobileWorkOrderActionFooter } from '@/features/work-orders/components/MobileWorkOrderActionFooter';
import { buildWorkOrderSheetQuickActions } from '@/features/work-orders/utils/buildWorkOrderSheetQuickActions';
import {
  MOBILE_WO_FAB_BOTTOM_CLASS,
  shouldShowMobileSyncBanner,
} from '@/features/work-orders/utils/workOrderDetailsViewModel';
import type { WorkOrderExportAudience } from '@/features/work-orders/utils/workOrderExportAccess';
import WorkOrderAcceptanceModal from '@/features/work-orders/components/WorkOrderAcceptanceModal';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import type { WorkOrderLike } from '@/features/work-orders/utils/workOrderTypeConversion';
import type { WorkOrderFileExportHandlers } from '@/features/work-orders/types/workOrderFileExportHandlers';
import type { UseMutationResult } from '@tanstack/react-query';

type WorkOrderDetailsOverlaysProps = {
  isMobile: boolean;
  workOrder: WorkOrder;
  organizationId: string;
  equipmentTeamId?: string | null;
  permissionLevels: {
    isManager: boolean;
    exportAudience?: WorkOrderExportAudience;
  };
  canAddNotes: boolean;
  canCaptureCosts: boolean;
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
  onDownloadWorksheet: () => Promise<void>;
  isMobileWorksheetGenerating: boolean;
  showMobileCompleteDialog: boolean;
  onMobileCompleteDialogOpenChange: (open: boolean) => void;
  mobileStatusMutation: Pick<UseMutationResult<unknown, unknown, unknown, unknown>, 'isPending'>;
  onCompleteMobileWorkOrder: () => void;
  showFieldAcceptDialog: boolean;
  onFieldAcceptDialogClose: () => void;
  onFieldAcceptComplete: () => void;
  fieldAcceptanceMutation: Pick<UseMutationResult<unknown, unknown, unknown, unknown>, 'isPending'>;
  onOpenNotesComposer: () => void;
  onScrollToCosts: () => void;
  onStartMobileWorkOrder: () => void;
  onPutAssignedMobileWorkOrderOnHold: () => void;
  onPauseResumeMobileWorkOrder: () => void;
  onOpenCompleteDialog: () => void;
  onScrollToChecklist: () => void;
  onRequestAccept: () => void;
  onRetrySync: () => void;
  /** Opens the work order QR / print dialog (issue #1151). */
  onShowWorkOrderQr: () => void;
} & WorkOrderFileExportHandlers;

export function WorkOrderDetailsOverlays({
  isMobile,
  workOrder,
  organizationId,
  equipmentTeamId,
  permissionLevels,
  canAddNotes,
  canCaptureCosts,
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
  onScrollToCosts,
  onStartMobileWorkOrder,
  onPutAssignedMobileWorkOrderOnHold,
  onPauseResumeMobileWorkOrder,
  onOpenCompleteDialog,
  onScrollToChecklist,
  onRequestAccept,
  onRetrySync,
  onShowWorkOrderQr,
}: WorkOrderDetailsOverlaysProps) {
  const showSyncBanner = showMobileActionFooter && shouldShowMobileSyncBanner(syncState);

  const quickActions = buildWorkOrderSheetQuickActions({
    workOrderStatus: workOrder.status,
    showMobileActionFooter,
    canAddNotes,
    canCaptureCosts,
    canCompletePmGate,
    isActionPending: mobileStatusMutation.isPending || fieldAcceptanceMutation.isPending,
    onRequestAccept,
    onStartMobileWorkOrder,
    onPutAssignedMobileWorkOrderOnHold,
    onPauseResumeMobileWorkOrder,
    onOpenCompleteDialog,
    onScrollToChecklist,
    onOpenNotesComposer,
    onScrollToCosts,
    onShowWorkOrderQr,
  });

  return (
    <>
      <WorkOrderPDFExportDialog
        open={showMobilePDFDialog}
        onOpenChange={onMobilePDFDialogOpenChange}
        onExport={onMobilePDFExport}
        isExporting={isMobilePDFGenerating}
        showCostsOption={permissionLevels.exportAudience === 'admin'}
        isGoogleWorkspaceConnected={permissionLevels.exportAudience === 'admin' && isGoogleWorkspaceConnected}
        hasOrganizationDriveDestination={permissionLevels.exportAudience === 'admin' && Boolean(googleDocsDestination)}
        onSaveToDrive={permissionLevels.exportAudience === 'admin' ? onMobileSaveToDrive : undefined}
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
          exportAudience={permissionLevels.exportAudience ?? 'none'}
          quickActions={quickActions}
          onOpenPdfDialog={onOpenMobilePdfDialog}
          onOpenDrivePdfDialog={onOpenMobileDrivePdfDialog}
          isGeneratingPdf={isMobilePDFGenerating}
          onDownloadWorksheet={onDownloadWorksheet}
          isGeneratingWorksheet={isMobileWorksheetGenerating}
          fileExportHandlers={
            permissionLevels.exportAudience === 'admin'
              ? {
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
                }
              : undefined
          }
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
            assignee_id: workOrder.assignee_id,
            created_by: workOrder.created_by,
          }}
          organizationId={organizationId}
          syncState={syncState}
          onRetrySync={onRetrySync}
        />
      )}

      {isMobile && (
        <Button
          type="button"
          size="icon"
          onClick={() => onMobileActionSheetOpenChange(true)}
          aria-label="Open work order quick actions"
          className={cn(
            'fixed right-4 z-fixed h-14 w-14 rounded-full shadow-elevation-3',
            showSyncBanner
              ? MOBILE_WO_FAB_BOTTOM_CLASS.withSyncBanner
              : MOBILE_WO_FAB_BOTTOM_CLASS.default,
            'touch-manipulation transition-transform duration-100 active:scale-[0.97]',
            'motion-reduce:active:scale-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
        >
          <Zap className="h-6 w-6" aria-hidden />
        </Button>
      )}
    </>
  );
}
