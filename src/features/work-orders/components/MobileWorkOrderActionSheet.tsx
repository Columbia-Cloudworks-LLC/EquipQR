/**
 * Mobile Work Order Action Sheet
 * 
 * A bottom sheet that consolidates all work order actions for mobile users.
 * Sections are role-gated:
 * - Work: Add note, Add photo (visible to techs and managers)
 * - Office tools: Download PDF, Export Excel (visible to managers/admins)
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
  Plus, 
  Camera, 
  Download, 
  FileSpreadsheet, 
  Loader2,
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
  canAddNotes: boolean;
  canUploadImages: boolean;
  isManager: boolean;
  onAddNote: () => void;
  onAddPhoto: () => void;
  onDownloadPDF: () => void;
  onExportExcel: () => void;
  isExportingExcel: boolean;
}

export const MobileWorkOrderActionSheet: React.FC<MobileWorkOrderActionSheetProps> = ({
  open,
  onOpenChange,
  workOrderId,
  workOrderStatus,
  equipmentTeamId,
  canAddNotes,
  canUploadImages,
  isManager,
  onAddNote,
  onAddPhoto,
  onDownloadPDF,
  onExportExcel,
  isExportingExcel,
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
            <SheetTitle>Actions</SheetTitle>
            <SheetDescription>
              Choose an action for this work order
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            {/* Work Section */}
            {(canAddNotes || canUploadImages) && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Work
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {canAddNotes && (
                    <Button
                      variant="outline"
                      className="h-14 flex-col gap-1"
                      onClick={() => handleAction(onAddNote)}
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-xs">Add Note</span>
                    </Button>
                  )}
                  {canUploadImages && (
                    <Button
                      variant="outline"
                      className="h-14 flex-col gap-1"
                      onClick={() => handleAction(onAddPhoto)}
                    >
                      <Camera className="h-5 w-5" />
                      <span className="text-xs">Add Photo</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Office Tools Section */}
            {isManager && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Office Tools
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-14 flex-col gap-1"
                      onClick={() => handleAction(onDownloadPDF)}
                    >
                      <Download className="h-5 w-5" />
                      <span className="text-xs">Download PDF</span>
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
                      <span className="text-xs">Export Excel</span>
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* QuickBooks Section */}
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

            {/* Danger Zone Section */}
            {canDelete && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-destructive uppercase tracking-wider">
                    Danger Zone
                  </p>
                  <Button
                    variant="outline"
                    className="w-full h-12 border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={deleteWorkOrderMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    <span>Delete Work Order</span>
                  </Button>
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
