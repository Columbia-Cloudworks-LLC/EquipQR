// fallow-ignore-file code-duplication
// Duplication rationale: Export button repeats guarded action blocks per target
/**
 * QuickBooks Export Button Component
 *
 * Allows admin/owners to export a work order to QuickBooks as a draft invoice.
 * Shows loading state and handles success/error feedback.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ExternalLink } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useQuery } from '@tanstack/react-query';
import { getConnectionStatus } from '@/services/quickbooks';
import { getQuickBooksInvoiceUrl } from '@/services/quickbooks/types';
import { useExportToQuickBooks } from '@/hooks/useExportToQuickBooks';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
import { useQuickBooksExportLogs, useQuickBooksLastExport } from '@/hooks/useExportToQuickBooks';
import { useAppToast } from '@/hooks/useAppToast';
import { isQuickBooksEnabled } from '@/lib/flags';
import { resolveQuickBooksCustomerId } from '@/features/teams/services/customerAccountService';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import type { QuickBooksExportLog } from '@/services/quickbooks/quickbooksService';
import {
  getQuickBooksExportAvailability,
  getQuickBooksInvoiceDisplay,
  QuickBooksExportButtonContent,
  QuickBooksExportStatusDetails,
} from '@/features/work-orders/components/quickBooksExportPresentation';

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
  /** Show export status and history in a popover */
  showStatusDetails?: boolean;
}

export const QuickBooksExportButton: React.FC<QuickBooksExportButtonProps> = ({
  workOrderId,
  teamId,
  workOrderStatus,
  asMenuItem = false,
  onExportSuccess,
  showStatusDetails = false,
}) => {
  const { formatDateTime } = useFormatTimestamp();

  const { currentOrganization } = useOrganization();
  const { success: showSuccessToast, error: showErrorToast } = useAppToast();

  const featureEnabled = isQuickBooksEnabled();

  const { data: canExport = false, isLoading: permissionLoading } = useQuickBooksAccess();

  const { data: connectionStatus, isLoading: connectionLoading } = useQuery({
    queryKey: ['quickbooks', 'connection', currentOrganization?.id],
    queryFn: () => getConnectionStatus(currentOrganization!.id),
    enabled: !!currentOrganization?.id && canExport && featureEnabled,
    staleTime: 60 * 1000,
  });

  const { data: resolvedQbCustomerId, isLoading: mappingLoading } = useQuery({
    queryKey: ['quickbooks', 'resolved-mapping', currentOrganization?.id, teamId],
    queryFn: () => resolveQuickBooksCustomerId(currentOrganization!.id, teamId!),
    enabled:
      !!currentOrganization?.id && !!teamId && canExport && featureEnabled && connectionStatus?.isConnected,
  });

  const { data: existingExport } = useQuickBooksLastExport(
    workOrderId,
    !!workOrderId && canExport && featureEnabled && connectionStatus?.isConnected
  );

  const shouldLoadStatusDetails = Boolean(
    showStatusDetails && !asMenuItem && workOrderId && canExport && featureEnabled && connectionStatus?.isConnected
  );

  const { data: exportLogs = [] } = useQuickBooksExportLogs(workOrderId, shouldLoadStatusDetails);

  const exportMutation = useExportToQuickBooks();

  if (!featureEnabled || !canExport) {
    return null;
  }

  const isExporting = exportMutation.isPending;
  const isLoading = connectionLoading || mappingLoading || isExporting || permissionLoading;
  const isConnected = connectionStatus?.isConnected;
  const hasMapping = !!resolvedQbCustomerId;
  const hasTeam = !!teamId;
  const isCompleted = workOrderStatus === 'completed';

  const { alreadyExported, hasInvoiceIdentifiers, invoiceDisplay } =
    getQuickBooksInvoiceDisplay(existingExport);

  const { tooltipMessage, isDisabled, showAsUpdate, showSetupState } = getQuickBooksExportAvailability({
    isCompleted,
    isConnected,
    hasTeam,
    hasMapping,
    isExporting,
    alreadyExported,
    hasInvoiceIdentifiers,
    invoiceDisplay,
  });

  const invoiceUrl =
    alreadyExported && existingExport?.quickbooks_invoice_id && existingExport?.quickbooks_environment
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

  const latestLog = exportLogs[0] ?? null;

  const formatTimestamp = (log: QuickBooksExportLog) => {
    const timestamp = log.exported_at ?? log.created_at;
    return timestamp ? formatDateTime(timestamp) : 'Unknown';
  };

  const handleCopy = async (label: string, value?: string | null) => {
    if (!value) {
      return;
    }

    if (!navigator?.clipboard?.writeText) {
      showErrorToast({
        title: 'Copy not supported',
        description: 'Your browser does not support clipboard access.',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      showSuccessToast({
        title: `${label} copied`,
        description: value,
      });
    } catch {
      showErrorToast({
        title: `Failed to copy ${label.toLowerCase()}`,
      });
    }
  };

  const statusDetails = (
    <QuickBooksExportStatusDetails
      showStatusDetails={showStatusDetails}
      asMenuItem={asMenuItem}
      latestLog={latestLog}
      exportLogs={exportLogs}
      isDisabled={isDisabled}
      isLoading={isLoading}
      onRetryExport={handleExport}
      onCopy={handleCopy}
      formatTimestamp={formatTimestamp}
    />
  );

  const buttonContent = (
    <QuickBooksExportButtonContent
      isLoading={isLoading}
      showAsUpdate={showAsUpdate}
      isDisabled={isDisabled}
      showSetupState={showSetupState}
      invoiceDisplay={invoiceDisplay}
    />
  );

  const handleViewInvoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (asMenuItem) {
    if (showSetupState) return null;

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

  if (alreadyExported && invoiceUrl) {
    return (
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={isDisabled || isLoading}>
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
        {statusDetails}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isDisabled || isLoading}>
              {buttonContent}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
      {statusDetails}
    </TooltipProvider>
  );
};
