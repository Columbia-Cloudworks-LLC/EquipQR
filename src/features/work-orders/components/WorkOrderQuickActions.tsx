import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, Download, ClipboardList, Trash2 } from 'lucide-react';
import { QuickBooksExportButton } from './QuickBooksExportButton';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
import { isQuickBooksEnabled } from '@/lib/flags';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';

interface WorkOrderQuickActionsProps {
  /** Work order ID for navigation */
  workOrderId: string;
  /** Work order status for QuickBooks export eligibility */
  workOrderStatus: WorkOrderStatus;
  /** Team ID derived from the equipment assigned to this work order */
  equipmentTeamId?: string | null;
  canDelete?: boolean;
  onDeleteClick?: () => void;
}

/**
 * Quick actions dropdown menu for work order cards.
 * Provides quick access to common actions without navigating to the detail page first.
 */
export const WorkOrderQuickActions: React.FC<WorkOrderQuickActionsProps> = ({
  workOrderId,
  workOrderStatus,
  equipmentTeamId,
  canDelete = false,
  onDeleteClick,
}) => {
  const navigate = useNavigate();
  
  // Check if user has QuickBooks access (billing admin permission)
  const { data: canManageQuickBooks = false } = useQuickBooksAccess();
  const quickBooksEnabled = isQuickBooksEnabled();
  const showQuickBooks = quickBooksEnabled && canManageQuickBooks;

  const handleAddNote = () => {
    navigate(`/dashboard/work-orders/${workOrderId}?action=add-note`);
  };

  const handleDownloadPDF = () => {
    navigate(`/dashboard/work-orders/${workOrderId}?action=download-pdf`);
  };

  const handlePrintFieldWorksheet = () => {
    navigate(`/dashboard/work-orders/${workOrderId}?action=download-worksheet`);
  };

  const stopCardNavigation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          aria-label="Quick actions"
          onClick={stopCardNavigation}
          onPointerDown={stopCardNavigation}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleAddNote}>
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadPDF}>
          <Download className="h-4 w-4 mr-2" />
          Service Report PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrintFieldWorksheet}>
          <ClipboardList className="h-4 w-4 mr-2" />
          Print Field Worksheet
        </DropdownMenuItem>
        {showQuickBooks && (
          <>
            <DropdownMenuSeparator />
            <QuickBooksExportButton
              workOrderId={workOrderId}
              teamId={equipmentTeamId ?? null}
              workOrderStatus={workOrderStatus}
              asMenuItem
            />
          </>
        )}
        {canDelete && onDeleteClick ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(event) => {
                stopCardNavigation(event);
                onDeleteClick();
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete work order
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
