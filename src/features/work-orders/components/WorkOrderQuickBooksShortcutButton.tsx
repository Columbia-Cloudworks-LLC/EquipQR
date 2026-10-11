import React from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import { useWorkOrderQuickBooksExportState } from '@/features/work-orders/hooks/useWorkOrderQuickBooksExportState';

interface WorkOrderQuickBooksShortcutButtonProps {
  workOrderId: string;
  teamId: string | null;
  workOrderStatus: WorkOrderStatus;
  onReviewInvoice: () => void;
}

/**
 * Header shortcut for the QuickBooks invoice review. Uses the same availability
 * rules as the Export menu, and stays hidden until QuickBooks setup is complete.
 */
export const WorkOrderQuickBooksShortcutButton: React.FC<WorkOrderQuickBooksShortcutButtonProps> = ({
  workOrderId,
  teamId,
  workOrderStatus,
  onReviewInvoice,
}) => {
  const {
    featureEnabled,
    canExport,
    accessLoading,
    isExporting,
    isLoading,
    hasLinkedInvoice,
    tooltipMessage,
    showSetupState,
    setupDisabled,
    updateLabel,
  } = useWorkOrderQuickBooksExportState({ workOrderId, teamId, workOrderStatus });

  if (!featureEnabled || accessLoading || !canExport || showSetupState || workOrderStatus !== 'completed') {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="default"
      className="gap-2 border-success/40 bg-success/10 text-success hover:bg-success/20 hover:text-success"
      onClick={onReviewInvoice}
      disabled={setupDisabled || isLoading}
      title={tooltipMessage}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-4 w-4" />
      )}
      {hasLinkedInvoice ? updateLabel : 'Export to QuickBooks'}
    </Button>
  );
};
