/**
 * QuickBooks Export Button Component
 * 
 * Allows admin/owners to export a work order to QuickBooks as a draft invoice.
 * Shows loading state and handles success/error feedback.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenuItem 
} from '@/components/ui/dropdown-menu';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FileSpreadsheet, RefreshCw, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery } from '@tanstack/react-query';
import { 
  getConnectionStatus,
  getTeamCustomerMapping,
  getLastSuccessfulExport
} from '@/services/quickbooks';
import { getQuickBooksInvoiceUrl } from '@/services/quickbooks/types';
import { useExportToQuickBooks } from '@/hooks/useExportToQuickBooks';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
import { isQuickBooksEnabled } from '@/lib/flags';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';

interface QuickBooksExportButtonProps {
  workOrderId: string;
  /**
   * Team ID derived from the equipment assigned to this work order.
   * QuickBooks customer mapping is done at the team level, and the team
   * association comes from the equipment (not the work order directly).
   */
  teamId: string | null;
  /**
   * Current status of the work order.
   *
   * Exports to QuickBooks are only allowed when the work order status is
   * `'completed'`. Other statuses will prevent the export action from
   * being available/enabled in the UI.
   */
  workOrderStatus: WorkOrderStatus;
  /** Render as a dropdown menu item instead of a button */
  asMenuItem?: boolean;
  /** Called after successful export */
  onExportSuccess?: () => void;
}

export const QuickBooksExportButton: React.FC<QuickBooksExportButtonProps> = ({
  workOrderId,
  teamId,
  workOrderStatus,
  asMenuItem = false,
  onExportSuccess
}) => {
  const { currentOrganization } = useOrganization();

  // Check if feature is enabled
  const featureEnabled = isQuickBooksEnabled();

  // Check QuickBooks management permission
  const { data: canExport = false, isLoading: permissionLoading } = useQuickBooksAccess();

  // Query for connection status
  const { data: connectionStatus, isLoading: connectionLoading } = useQuery({
    queryKey: ['quickbooks', 'connection', currentOrganization?.id],
    queryFn: () => getConnectionStatus(currentOrganization!.id),
    enabled: !!currentOrganization?.id && canExport && featureEnabled,
    staleTime: 60 * 1000,
  });

  // Query for team customer mapping
  const { data: teamMapping, isLoading: mappingLoading } = useQuery({
    queryKey: ['quickbooks', 'team-mapping', currentOrganization?.id, teamId],
    queryFn: () => getTeamCustomerMapping(currentOrganization!.id, teamId!),
    enabled: !!currentOrganization?.id && !!teamId && canExport && featureEnabled && connectionStatus?.isConnected,
  });

  // Query for existing export
  const { data: existingExport } = useQuery({
    queryKey: ['quickbooks', 'export', workOrderId],
    queryFn: () => getLastSuccessfulExport(workOrderId),
    enabled: !!workOrderId && canExport && featureEnabled && connectionStatus?.isConnected,
    staleTime: 30 * 1000,
  });

  // Export mutation using the hook
  const exportMutation = useExportToQuickBooks();

  // Don't render if feature is disabled or user doesn't have permission
  if (!featureEnabled || !canExport) {
    return null;
  }

  // Determine button state and tooltip
  const isExporting = exportMutation.isPending;
  const isLoading = connectionLoading || mappingLoading || isExporting || permissionLoading;
  const isConnected = connectionStatus?.isConnected;
  const hasMapping = !!teamMapping;
  const hasTeam = !!teamId;
  const alreadyExported = !!existingExport;
  const isCompleted = workOrderStatus === 'completed';

  // Calculate invoice display once for reuse in tooltip and button content
  // Use 'Unknown' as fallback to indicate data inconsistency (export exists but no invoice identifiers)
  const hasInvoiceIdentifiers = Boolean(
    existingExport?.quickbooks_invoice_number || existingExport?.quickbooks_invoice_id
  );
  const invoiceDisplay = alreadyExported && hasInvoiceIdentifiers
    ? (existingExport.quickbooks_invoice_number || existingExport.quickbooks_invoice_id)
    : alreadyExported
      ? 'Unknown'
      : null;

  let tooltipMessage = '';
  let isDisabled = false;

  if (!isCompleted) {
    tooltipMessage = 'Work order must be completed before exporting to QuickBooks.';
    isDisabled = true;
  } else if (!isConnected) {
    tooltipMessage = 'QuickBooks is not connected. Connect in Organization Settings.';
    isDisabled = true;
  } else if (!hasTeam) {
    tooltipMessage = 'Equipment must be assigned to a team to export.';
    isDisabled = true;
  } else if (!hasMapping) {
    tooltipMessage = "Equipment's team does not have a QuickBooks customer mapping. Set up mapping in Team Settings.";
    isDisabled = true;
  } else if (isExporting) {
    tooltipMessage = 'Exporting...';
    isDisabled = true;
  } else if (alreadyExported) {
    tooltipMessage = `Previously exported as Invoice ${invoiceDisplay}. Click to update.`;
  } else {
    tooltipMessage = 'Export work order as a draft invoice in QuickBooks';
  }

  // Build invoice URL if we have the data
  const invoiceUrl = alreadyExported && existingExport.quickbooks_invoice_id && existingExport.quickbooks_environment
    ? getQuickBooksInvoiceUrl(existingExport.quickbooks_invoice_id, existingExport.quickbooks_environment)
    : null;

  const handleExport = () => {
    if (isDisabled) return;
    exportMutation.mutate(workOrderId, {
      onSuccess: () => {
        onExportSuccess?.();
      },
    });
  };

  const buttonContent = (
    <>
      {isLoading ? (
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
      ) : alreadyExported ? (
        <CheckCircle className="h-4 w-4 mr-2" />
      ) : isDisabled ? (
        <AlertTriangle className="h-4 w-4 mr-2" />
      ) : (
        <FileSpreadsheet className="h-4 w-4 mr-2" />
      )}
      {alreadyExported ? `Update Invoice ${invoiceDisplay}` : 'Export to QuickBooks'}
    </>
  );

  // Handle opening the invoice in QuickBooks
  const handleViewInvoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (asMenuItem) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuItem
              onClick={handleExport}
              disabled={isDisabled || isLoading}
              className={isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {buttonContent}
            </DropdownMenuItem>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="max-w-xs">{tooltipMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // When already exported, show both update and view buttons
  if (alreadyExported && invoiceUrl) {
    return (
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={isDisabled || isLoading}
                >
                  {buttonContent}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{tooltipMessage}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleViewInvoice}
                aria-label="View invoice in QuickBooks"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open Invoice {invoiceDisplay} in QuickBooks</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isDisabled || isLoading}
            >
              {buttonContent}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default QuickBooksExportButton;
