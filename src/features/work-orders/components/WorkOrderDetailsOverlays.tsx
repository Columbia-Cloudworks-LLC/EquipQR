import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle, ClipboardCheck, Play, Plus, QrCode, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkOrderPDFExportDialog } from '@/features/work-orders/components/WorkOrderPDFExportDialog';
import {
  MobileWorkOrderActionSheet,
  type WorkOrderSheetQuickAction,
} from '@/features/work-orders/components/MobileWorkOrderActionSheet';
import { MobileWorkOrderActionFooter } from '@/features/work-orders/components/MobileWorkOrderActionFooter';
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
  onShowWorkOrderQr,
}: WorkOrderDetailsOverlaysProps) {
  // Contextual quick actions for the mobile sheet (issue #1151): the next
  // relevant status transition, note/photo capture, and the WO QR code.
  const nextStatusQuickAction = ((): WorkOrderSheetQuickAction | null => {
    if (!showMobileActionFooter) return null;
    switch (workOrder.status) {
      case 'submitted':
        return { id: 'accept', label: 'Accept work order', icon: CheckCircle, onSelect: onRequestAccept };
      case 'assigned':
      case 'accepted':
        return { id: 'start', label: 'Start work', icon: Play, onSelect: onStartMobileWorkOrder };
      case 'in_progress':
        return canCompletePmGate
          ? { id: 'complete', label: 'Complete work order', icon: CheckCircle, onSelect: onOpenCompleteDialog }
          : { id: 'checklist', label: 'Continue checklist', icon: ClipboardCheck, onSelect: onScrollToChecklist };
      case 'on_hold':
        return { id: 'resume', label: 'Resume work', icon: Play, onSelect: onPauseResumeMobileWorkOrder };
      default:
        return null;
    }
  })();

  const quickActions: WorkOrderSheetQuickAction[] = [
    ...(nextStatusQuickAction ? [nextStatusQuickAction] : []),
    ...(canAddNotes
      ? [
          { id: 'add-note', label: 'Add note', icon: Plus, onSelect: onOpenNotesComposer },
          ...(workOrder.status !== 'submitted'
            ? [{ id: 'add-photo', label: 'Add photo', icon: Camera, onSelect: onOpenPhotoCapture }]
            : []),
        ]
      : []),
    { id: 'wo-qr', label: 'Show work order QR code', icon: QrCode, onSelect: onShowWorkOrderQr },
  ];

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
          onViewFullDetails={onViewFullDetails}
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
          onOpenQuickActions={() => onMobileActionSheetOpenChange(true)}
        />
      )}

      {/* Quick access button when the field footer is hidden (issue #1151). */}
      {isMobile && !showMobileActionFooter && (
        <Button
          type="button"
          size="icon"
          onClick={() => onMobileActionSheetOpenChange(true)}
          aria-label="Open work order quick actions"
          className={cn(
            'fixed bottom-[78px] right-4 z-fixed h-14 w-14 rounded-full shadow-elevation-3',
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
