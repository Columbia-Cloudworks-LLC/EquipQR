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
import {
  PanelRight,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { WorkOrderMobileExportSection } from '@/features/work-orders/components/WorkOrderMobileExportSection';
import { QuickBooksExportButton } from './QuickBooksExportButton';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useDeleteWorkOrder } from '@/features/work-orders/hooks/useDeleteWorkOrder';
import { useWorkOrderImageCount } from '@/features/work-orders/hooks/useWorkOrderImageCount';
import { isQuickBooksEnabled } from '@/lib/flags';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import type { WorkOrderFileExportHandlers } from '@/features/work-orders/types/workOrderFileExportHandlers';

interface MobileWorkOrderActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  workOrderStatus: WorkOrderStatus;
  equipmentTeamId?: string | null;
  organizationId?: string;
  isManager: boolean;
  /** Opens sidebar / overlay with metadata (mobile) */
  onViewFullDetails: () => void;
  onOpenPdfDialog: () => void;
  onOpenDrivePdfDialog: () => void;
  isGeneratingPdf: boolean;
  onDownloadWorksheet: () => void;
  isGeneratingWorksheet: boolean;
} & WorkOrderFileExportHandlers;

export const MobileWorkOrderActionSheet: React.FC<MobileWorkOrderActionSheetProps> = ({
  open,
  onOpenChange,
  workOrderId,
  workOrderStatus,
  equipmentTeamId,
  organizationId,
  isManager,
  onViewFullDetails,
  onOpenPdfDialog,
  onOpenDrivePdfDialog,
  isGeneratingPdf,
  onDownloadWorksheet,
  isGeneratingWorksheet,
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="flex max-h-[85dvh] flex-col gap-0 rounded-t-xl p-0 pb-safe-bottom"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b px-6 pb-4 pt-6 text-left">
            <SheetTitle>More work order options</SheetTitle>
            <SheetDescription>
              Field tools stay in the footer. Office and admin options are here.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-4 pb-2">
            {/* Details — always first */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Details
              </p>
              <Button
                variant="outline"
                className="h-12 w-full justify-start gap-2"
                onClick={() => handleAction(onViewFullDetails)}
              >
                <PanelRight className="h-5 w-5" aria-hidden />
                <span className="text-sm font-medium">View full details</span>
              </Button>
            </div>

            {isManager && (
              <>
                <Separator />
                <WorkOrderMobileExportSection
                  workOrderId={workOrderId}
                  organizationId={organizationId}
                  isManager={isManager}
                  onAction={handleAction}
                  onOpenPdfDialog={onOpenPdfDialog}
                  onOpenDrivePdfDialog={onOpenDrivePdfDialog}
                  isGeneratingPdf={isGeneratingPdf}
                  onDownloadXlsx={onDownloadXlsx}
                  isExportingXlsx={isExportingXlsx}
                  onDownloadCsv={onDownloadCsv}
                  isExportingCsv={isExportingCsv}
                  onDownloadDocx={onDownloadDocx}
                  isExportingDocx={isExportingDocx}
                  docxDisabled={docxDisabled}
                  onDownloadWorksheet={onDownloadWorksheet}
                  isGeneratingWorksheet={isGeneratingWorksheet}
                  onDriveDocs={onDriveDocs}
                  isExportingToDocs={isExportingToDocs}
                  onDriveSheets={onDriveSheets}
                  isExportingToSheets={isExportingToSheets}
                  isExportBusy={isExportBusy}
                />
              </>
            )}

            {showQuickBooks && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    QuickBooks
                  </p>
                  <QuickBooksExportButton
                    workOrderId={workOrderId}
                    teamId={equipmentTeamId ?? null}
                    workOrderStatus={workOrderStatus}
                  />
                </div>
              </>
            )}

            {showAdminSection && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Admin
                  </p>
                  {canDelete ? (
                    <Button
                      variant="outline"
                      className="h-12 w-full border-destructive/50 justify-start gap-2 text-destructive hover:bg-destructive/10"
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

interface MobileActionSheetTriggerProps {
  onClick: () => void;
}

const MobileActionSheetTrigger: React.FC<MobileActionSheetTriggerProps> = ({
  onClick,
}) => {
  return (
    <Button 
      variant="ghost" 
      size="sm"
      onClick={onClick}
      className="p-2"
      aria-label="More actions"
    >
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  );
};

