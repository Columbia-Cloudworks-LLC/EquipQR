/**
 * Mobile Work Order Action Sheet
 *
 * Consolidates work order actions for mobile users.
 * Export options mirror the desktop Export menu (Download + Google Drive + QuickBooks + Admin).
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { WorkOrderDeleteConfirmDialog } from '@/features/work-orders/components/WorkOrderDeleteConfirmDialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { WorkOrderMobileExportSection } from '@/features/work-orders/components/WorkOrderMobileExportSection';
import { QuickBooksExportButton } from './QuickBooksExportButton';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useDeleteWorkOrder } from '@/features/work-orders/hooks/useDeleteWorkOrder';
import { useWorkOrderImageCount } from '@/features/work-orders/hooks/useWorkOrderImageCount';
import { isQuickBooksEnabled } from '@/lib/flags';
import {
  getWorkOrderSheetQuickActionButtonProps,
  groupWorkOrderSheetQuickActions,
} from '@/features/work-orders/utils/workOrderSheetQuickActionStyles';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import type { WorkOrderExportAudience } from '@/features/work-orders/utils/workOrderExportAccess';
import type { WorkOrderFileExportHandlers } from '@/features/work-orders/types/workOrderFileExportHandlers';

import type { WorkOrderSheetQuickActionTone } from '@/features/work-orders/utils/workOrderSheetQuickActionStyles';

export interface WorkOrderSheetQuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: WorkOrderSheetQuickActionTone;
  onSelect: () => void;
  disabled?: boolean;
}

interface MobileWorkOrderActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  workOrderStatus: WorkOrderStatus;
  equipmentTeamId?: string | null;
  organizationId?: string;
  exportAudience: WorkOrderExportAudience;
  /** Contextual shortcuts (next status action, note/photo, WO QR) — issue #1151. */
  quickActions?: WorkOrderSheetQuickAction[];
  onOpenPdfDialog: () => void;
  onOpenDrivePdfDialog: () => void;
  isGeneratingPdf: boolean;
  onDownloadWorksheet: () => void;
  isGeneratingWorksheet: boolean;
  fileExportHandlers?: WorkOrderFileExportHandlers;
}

export const MobileWorkOrderActionSheet: React.FC<MobileWorkOrderActionSheetProps> = ({
  open,
  onOpenChange,
  workOrderId,
  workOrderStatus,
  equipmentTeamId,
  organizationId,
  exportAudience,
  quickActions,
  onOpenPdfDialog,
  onOpenDrivePdfDialog,
  isGeneratingPdf,
  onDownloadWorksheet,
  isGeneratingWorksheet,
  fileExportHandlers,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const navigate = useNavigate();

  // Check if user has QuickBooks access (billing admin permission)
  const { data: canManageQuickBooks = false } = useQuickBooksAccess();
  const quickBooksEnabled = isQuickBooksEnabled();
  const showQuickBooks = quickBooksEnabled && canManageQuickBooks;

  // Delete permissions and hooks
  const permissions = useUnifiedPermissions();
  const deleteWorkOrderMutation = useDeleteWorkOrder();
  const { data: imageData } = useWorkOrderImageCount(workOrderId);
  const canDelete = permissions.hasRole(['owner', 'admin']);
  const showAdminSection = canDelete;

  const handleAction = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  const handleDeleteConfirm = async () => {
    if (!canDelete) return;
    try {
      await deleteWorkOrderMutation.mutateAsync(workOrderId);
      setDeleteConfirmText('');
      setShowDeleteDialog(false);
      onOpenChange(false);
      navigate('/dashboard/work-orders');
    } catch {
      // Error is handled in the mutation
    }
  };

  const quickActionGroups =
    quickActions && quickActions.length > 0
      ? groupWorkOrderSheetQuickActions(quickActions)
      : null;

  const renderQuickActionButton = (action: WorkOrderSheetQuickAction) => {
    const { variant, className } = getWorkOrderSheetQuickActionButtonProps(action.tone);
    return (
      <Button
        key={action.id}
        variant={variant}
        className={className}
        disabled={action.disabled}
        onClick={() => handleAction(action.onSelect)}
      >
        <action.icon className="h-5 w-5 shrink-0" aria-hidden />
        <span className="text-sm font-medium">{action.label}</span>
      </Button>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="flex max-h-[85dvh] flex-col gap-0 rounded-t-xl p-0 pb-safe-bottom"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b px-6 pb-4 pt-6 text-left">
            <SheetTitle>Work order actions</SheetTitle>
            <SheetDescription>
              Manage this work order, export records, and run admin actions without leaving the page.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-4 pb-2">
            {quickActionGroups ? (
              <>
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Quick actions
                  </p>

                  {quickActionGroups.workflow.length > 0 ? (
                    <div className="space-y-2">
                      {quickActionGroups.workflow.map(renderQuickActionButton)}
                    </div>
                  ) : null}

                  {quickActionGroups.capture.length > 0 ? (
                    <div className="space-y-2">
                      {quickActionGroups.workflow.length > 0 ? (
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                          Capture
                        </p>
                      ) : null}
                      {quickActionGroups.capture.map(renderQuickActionButton)}
                    </div>
                  ) : null}

                  {quickActionGroups.utility.length > 0 ? (
                    <div className="space-y-2">
                      {(quickActionGroups.workflow.length > 0 || quickActionGroups.capture.length > 0) ? (
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                          Share
                        </p>
                      ) : null}
                      {quickActionGroups.utility.map(renderQuickActionButton)}
                    </div>
                  ) : null}
                </div>
                <Separator />
              </>
            ) : null}

            {exportAudience !== 'none' && (
              <>
                <WorkOrderMobileExportSection
                  workOrderId={workOrderId}
                  organizationId={organizationId}
                  exportAudience={exportAudience}
                  onAction={handleAction}
                  onOpenPdfDialog={onOpenPdfDialog}
                  onOpenDrivePdfDialog={onOpenDrivePdfDialog}
                  isGeneratingPdf={isGeneratingPdf}
                  onDownloadXlsx={fileExportHandlers?.onDownloadXlsx ?? (() => undefined)}
                  isExportingXlsx={fileExportHandlers?.isExportingXlsx ?? false}
                  onDownloadCsv={fileExportHandlers?.onDownloadCsv ?? (() => undefined)}
                  isExportingCsv={fileExportHandlers?.isExportingCsv ?? false}
                  onDownloadDocx={fileExportHandlers?.onDownloadDocx ?? (() => undefined)}
                  isExportingDocx={fileExportHandlers?.isExportingDocx ?? false}
                  docxDisabled={fileExportHandlers?.docxDisabled}
                  onDownloadWorksheet={onDownloadWorksheet}
                  isGeneratingWorksheet={isGeneratingWorksheet}
                  onDriveDocs={fileExportHandlers?.onDriveDocs ?? (() => undefined)}
                  isExportingToDocs={fileExportHandlers?.isExportingToDocs ?? false}
                  onDriveSheets={fileExportHandlers?.onDriveSheets ?? (() => undefined)}
                  isExportingToSheets={fileExportHandlers?.isExportingToSheets ?? false}
                  isExportBusy={fileExportHandlers?.isExportBusy ?? isGeneratingPdf}
                />
              </>
            )}

            {showQuickBooks && (
              <>
                <Separator />
                <div className="space-y-2 rounded-xl border border-border/60 bg-muted/15 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    QuickBooks
                  </p>
                  <div className="[&_button]:h-12 [&_button]:w-full [&_button]:justify-start [&_button]:gap-2 [&_button]:border-border/60 [&_button]:bg-background/80">
                    <QuickBooksExportButton
                      workOrderId={workOrderId}
                      teamId={equipmentTeamId ?? null}
                      workOrderStatus={workOrderStatus}
                    />
                  </div>
                </div>
              </>
            )}

            {showAdminSection && (
              <>
                <Separator />
                <div className="space-y-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-destructive/80">
                    Admin
                  </p>
                  {canDelete ? (
                    <Button
                      variant="destructive"
                      className="h-12 w-full justify-start gap-2"
                      onClick={() => {
                        setDeleteConfirmText('');
                        setShowDeleteDialog(true);
                      }}
                      disabled={deleteWorkOrderMutation.isPending}
                    >
                      <Trash2 className="h-5 w-5" aria-hidden />
                      <span className="text-sm font-medium">Delete work order</span>
                    </Button>
                  ) : null}
                </div>
              </>
            )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <WorkOrderDeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        imageData={imageData}
        isDeleting={deleteWorkOrderMutation.isPending}
        onConfirm={handleDeleteConfirm}
        requireTypedConfirm
        confirmText={deleteConfirmText}
        onConfirmTextChange={setDeleteConfirmText}
        confirmInputId="mobile-work-order-delete-confirm"
      />
    </>
  );
};
