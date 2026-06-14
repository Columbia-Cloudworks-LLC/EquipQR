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
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery } from '@tanstack/react-query';
import { getConnectionStatus, getTeamCustomerMapping } from '@/services/quickbooks';
import { getQuickBooksInvoiceUrl } from '@/services/quickbooks/types';
import { useExportToQuickBooks, useQuickBooksLastExport } from '@/hooks/useExportToQuickBooks';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
import { isQuickBooksEnabled } from '@/lib/flags';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import {
  getQuickBooksExportAvailability,
  getQuickBooksInvoiceDisplay,
} from '@/features/work-orders/components/quickBooksExportPresentation';

interface WorkOrderQuickBooksExportSubmenuProps {
  workOrderId: string;
  teamId: string | null;
  workOrderStatus: WorkOrderStatus;
}

export const WorkOrderQuickBooksExportSubmenu: React.FC<WorkOrderQuickBooksExportSubmenuProps> = ({
  workOrderId,
  teamId,
  workOrderStatus,
}) => {
  const { currentOrganization } = useOrganization();
  const featureEnabled = isQuickBooksEnabled();
  const { data: canExport = false } = useQuickBooksAccess();

  const { data: connectionStatus, isLoading: connectionLoading } = useQuery({
    queryKey: ['quickbooks', 'connection', currentOrganization?.id],
    queryFn: () => getConnectionStatus(currentOrganization!.id),
    enabled: !!currentOrganization?.id && canExport && featureEnabled,
    staleTime: 60 * 1000,
  });

  const { data: teamMapping, isLoading: mappingLoading } = useQuery({
    queryKey: ['quickbooks', 'team-mapping', currentOrganization?.id, teamId],
    queryFn: () => getTeamCustomerMapping(currentOrganization!.id, teamId!),
    enabled:
      !!currentOrganization?.id && !!teamId && canExport && featureEnabled && connectionStatus?.isConnected,
  });

  const { data: existingExport } = useQuickBooksLastExport(
    workOrderId,
    !!workOrderId && canExport && featureEnabled && connectionStatus?.isConnected,
  );

  const exportMutation = useExportToQuickBooks();

  if (!featureEnabled || !canExport) {
    return null;
  }

  const isExporting = exportMutation.isPending;
  const isLoading = connectionLoading || mappingLoading || isExporting;
  const isConnected = connectionStatus?.isConnected;
  const hasMapping = !!teamMapping;
  const hasTeam = !!teamId;
  const isCompleted = workOrderStatus === 'completed';

  const { alreadyExported, hasInvoiceIdentifiers, invoiceDisplay } =
    getQuickBooksInvoiceDisplay(existingExport);

  const { tooltipMessage, isDisabled, showSetupState } = getQuickBooksExportAvailability({
    isCompleted,
    isConnected,
    hasTeam,
    hasMapping,
    isExporting,
    alreadyExported,
    hasInvoiceIdentifiers,
    invoiceDisplay,
  });

  if (showSetupState) {
    return null;
  }

  const invoiceUrl =
    alreadyExported && existingExport?.quickbooks_invoice_id && existingExport?.quickbooks_environment
      ? getQuickBooksInvoiceUrl(existingExport.quickbooks_invoice_id, existingExport.quickbooks_environment)
      : null;

  const hasLinkedInvoice = alreadyExported && hasInvoiceIdentifiers;
  const setupDisabled = isDisabled && !hasLinkedInvoice;

  const handleCreate = () => {
    if (hasLinkedInvoice || setupDisabled || isLoading) return;
    exportMutation.mutate(workOrderId);
  };

  const handleUpdate = () => {
    if (!hasLinkedInvoice || setupDisabled || isLoading) return;
    exportMutation.mutate(workOrderId);
  };

  const handleOpen = () => {
    if (!invoiceUrl) return;
    window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
  };

  const updateLabel = invoiceDisplay ? `Update Invoice #${invoiceDisplay}` : 'Update Invoice';

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>QuickBooks</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                onClick={handleCreate}
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
                onClick={handleUpdate}
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
