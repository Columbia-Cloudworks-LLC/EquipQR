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
import { MoreHorizontal, Plus, Download } from 'lucide-react';
import { QuickBooksExportButton } from './QuickBooksExportButton';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';

interface WorkOrderQuickActionsProps {
  /** Work order ID for navigation */
  workOrderId: string;
  /** Work order status for QuickBooks export eligibility */
  workOrderStatus: WorkOrderStatus;
  /** Team ID derived from the equipment assigned to this work order */
  equipmentTeamId?: string | null;
}

/**
 * Quick actions dropdown menu for work order cards.
 * Provides quick access to common actions without navigating to the detail page first.
 */
export const WorkOrderQuickActions: React.FC<WorkOrderQuickActionsProps> = ({
  workOrderId,
  workOrderStatus,
  equipmentTeamId,
}) => {
  const navigate = useNavigate();

  const handleAddNote = () => {
    navigate(`/dashboard/work-orders/${workOrderId}?action=add-note`);
  };

  const handleDownloadPDF = () => {
    navigate(`/dashboard/work-orders/${workOrderId}?action=download-pdf`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          aria-label="Quick actions"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
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
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <QuickBooksExportButton
          workOrderId={workOrderId}
          teamId={equipmentTeamId ?? null}
          workOrderStatus={workOrderStatus}
          asMenuItem
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WorkOrderQuickActions;
