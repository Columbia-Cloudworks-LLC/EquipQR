/**
 * Mobile Work Order Action Sheet
 * 
 * A bottom sheet that consolidates all work order actions for mobile users.
 * Sections are role-gated:
 * - Work: Add note, Add photo (visible to techs and managers)
 * - Office tools: Download PDF, Export Excel (visible to managers/admins)
 * - QuickBooks: Export (visible only to users with can_manage_quickbooks)
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import { QuickBooksExportButton } from './QuickBooksExportButton';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
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
  // Check if user has QuickBooks access (billing admin permission)
  const { data: canManageQuickBooks = false } = useQuickBooksAccess();
  const quickBooksEnabled = isQuickBooksEnabled();
  const showQuickBooks = quickBooksEnabled && canManageQuickBooks;

  const handleAction = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
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
        </div>
      </SheetContent>
    </Sheet>
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
