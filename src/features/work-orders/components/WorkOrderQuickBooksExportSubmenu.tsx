import React from 'react';
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ExternalLink, FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';
import { getQuickBooksInvoiceUrl } from '@/services/quickbooks/types';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import { useWorkOrderQuickBooksExportState } from '@/features/work-orders/hooks/useWorkOrderQuickBooksExportState';

interface WorkOrderQuickBooksExportSubmenuProps {
  workOrderId: string;
  teamId: string | null;
  workOrderStatus: WorkOrderStatus;
  onReviewInvoice: () => void;
}

export const WorkOrderQuickBooksExportSubmenu: React.FC<WorkOrderQuickBooksExportSubmenuProps> = ({
  workOrderId,
  teamId,
  workOrderStatus,
  onReviewInvoice,
}) => {
  const {
    featureEnabled,
    canExport,
    accessLoading,
    existingExport,
    isExporting,
    isLoading,
    alreadyExported,
    hasLinkedInvoice,
    invoiceDisplay,
    tooltipMessage,
    showSetupState,
    setupDisabled,
    updateLabel,
  } = useWorkOrderQuickBooksExportState({ workOrderId, teamId, workOrderStatus });

  if (!featureEnabled) {
    return null;
  }

  // Keep the submenu mounted (disabled) while the permission check is in
  // flight so QuickBooks does not vanish from the first Export-menu open
  // after a page load and pop in on the second open.
  if (accessLoading) {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger disabled>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          QuickBooks
        </DropdownMenuSubTrigger>
      </DropdownMenuSub>
    );
  }

  if (!canExport || showSetupState) {
    return null;
  }

  const invoiceUrl =
    alreadyExported && existingExport?.quickbooks_invoice_id && existingExport?.quickbooks_environment
      ? getQuickBooksInvoiceUrl(existingExport.quickbooks_invoice_id, existingExport.quickbooks_environment)
      : null;

  const handleCreate = () => {
    if (hasLinkedInvoice || setupDisabled || isLoading) return;
    onReviewInvoice();
  };

  const handleUpdate = () => {
    if (!hasLinkedInvoice || setupDisabled || isLoading) return;
    onReviewInvoice();
  };

  const handleOpen = () => {
    if (!invoiceUrl) return;
    window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>QuickBooks</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                onSelect={handleCreate}
                disabled={hasLinkedInvoice || setupDisabled || isLoading}
              >
                {isExporting && !hasLinkedInvoice ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                Create New Invoice
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="max-w-xs">
                {hasLinkedInvoice
                  ? `Invoice ${invoiceDisplay} is already linked to this work order.`
                  : tooltipMessage}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                onSelect={handleUpdate}
                disabled={!hasLinkedInvoice || setupDisabled || isLoading}
              >
                {isExporting && hasLinkedInvoice ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {updateLabel}
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="max-w-xs">
                {!hasLinkedInvoice
                  ? 'Create an invoice first before updating.'
                  : tooltipMessage}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                onClick={handleOpen}
                disabled={!hasLinkedInvoice || !invoiceUrl}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Invoice
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="max-w-xs">
                {!hasLinkedInvoice
                  ? 'Create an invoice first to open it in QuickBooks.'
                  : `Open Invoice ${invoiceDisplay} in QuickBooks`}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
