/**
 * Mobile Work Order Action Sheet
 * 
 * A bottom sheet that consolidates all work order actions for mobile users.
 * Sections are role-gated:
 * - Office tools: Service Report PDF, Internal Work Order Packet (visible to managers/admins)
 * - QuickBooks: Export (visible only to users with can_manage_quickbooks)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Download,
  ClipboardList,
  Loader2,
  FileSpreadsheet,
  FileText,
  PanelRight,
  PencilLine,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { QuickBooksExportButton } from './QuickBooksExportButton';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { useDeleteWorkOrder } from '@/features/work-orders/hooks/useDeleteWorkOrder';
import { useWorkOrderImageCount } from '@/features/work-orders/hooks/useWorkOrderImageCount';
import { isQuickBooksEnabled } from '@/lib/flags';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';

interface MobileWorkOrderActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  workOrderStatus: WorkOrderStatus;
  equipmentTeamId?: string | null;
  isManager: boolean;
  /** Opens sidebar / overlay with metadata (mobile) */
  onViewFullDetails: () => void;
  canEdit?: boolean;
  onEdit?: () => void;
  onDownloadPDF: () => void;
  onDownloadWorksheet: () => void;
  isGeneratingWorksheet: boolean;
  onExportExcel: () => void;
  isExportingExcel: boolean;
  onExportGoogleDoc?: () => void;
  isExportingGoogleDoc?: boolean;
}

export const MobileWorkOrderActionSheet: React.FC<MobileWorkOrderActionSheetProps> = ({
  open,
  onOpenChange,
  workOrderId,
  workOrderStatus,
  equipmentTeamId,
  isManager,
  onViewFullDetails,
  canEdit = false,
  onEdit,
  onDownloadPDF,
  onDownloadWorksheet,
  isGeneratingWorksheet,
  onExportExcel,
  isExportingExcel,
  onExportGoogleDoc,
  isExportingGoogleDoc = false,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
  const showAdminSection = Boolean((canEdit && onEdit) || canDelete);

  const handleAction = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteWorkOrderMutation.mutateAsync(workOrderId);
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
        <SheetContent side="bottom" className="rounded-t-xl pb-safe-bottom">
          <SheetHeader className="text-left pb-4">
            <SheetTitle>More work order options</SheetTitle>
            <SheetDescription>
              Field tools stay in the footer. Office and admin options are here.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
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

            {/* Office tools / exports */}
            {isManager && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Office tools
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-14 flex-col gap-1"
                      onClick={() => handleAction(onDownloadPDF)}
                    >
                      <Download className="h-5 w-5" />
                      <span className="text-xs">Service Report PDF</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 flex-col gap-1"
                      onClick={() => handleAction(onDownloadWorksheet)}
                      disabled={isGeneratingWorksheet}
                    >
                      {isGeneratingWorksheet ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ClipboardList className="h-5 w-5" />
                      )}
                      <span className="text-xs">Field Worksheet</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 flex-col gap-1"
                      onClick={() => handleAction(onExportExcel)}
                      disabled={isExportingExcel}
                    >
                      {isExportingExcel ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-5 w-5" />
                      )}
                      <span className="text-xs">Internal Work Order Packet</span>
                    </Button>
                    {onExportGoogleDoc && (
                      <Button
                        variant="outline"
                        className="h-14 flex-col gap-1"
                        onClick={() => handleAction(onExportGoogleDoc)}
                        disabled={isExportingGoogleDoc}
                      >
                        {isExportingGoogleDoc ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                        <span className="text-xs">Google Doc Packet</span>
                      </Button>
                    )}
                  </div>
                </div>
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
                  {canEdit && onEdit ? (
                    <Button
                      variant="outline"
                      className="h-12 w-full justify-start gap-2"
                      onClick={() => handleAction(onEdit)}
                    >
                      <PencilLine className="h-5 w-5" aria-hidden />
                      <span className="text-sm font-medium">Edit work order</span>
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      variant="outline"
                      className="h-12 w-full border-destructive/50 justify-start gap-2 text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDeleteDialog(true)}
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
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this work order? This action is irreversible and will permanently remove:
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Work order details and description</li>
                <li>• All notes and comments</li>
                <li>• Cost records and estimates</li>
                <li>• Status history</li>
                <li>• Preventative maintenance records</li>
                {imageData && imageData.count > 0 && (
                  <li className="flex items-center gap-2">
                    • All uploaded images
                    <Badge variant="destructive" className="text-xs">
                      {imageData.count} image{imageData.count !== 1 ? 's' : ''}
                    </Badge>
                  </li>
                )}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteWorkOrderMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteWorkOrderMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteWorkOrderMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

interface MobileActionSheetTriggerProps {
  onClick: () => void;
}

export const MobileActionSheetTrigger: React.FC<MobileActionSheetTriggerProps> = ({
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

export default MobileWorkOrderActionSheet;
