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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, RefreshCw, CheckCircle, AlertTriangle, ExternalLink, Info, Copy } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery } from '@tanstack/react-query';
import { 
  getConnectionStatus,
  getTeamCustomerMapping,
} from '@/services/quickbooks';
import { getQuickBooksInvoiceUrl } from '@/services/quickbooks/types';
import { useExportToQuickBooks } from '@/hooks/useExportToQuickBooks';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
import { useQuickBooksExportLogs, useQuickBooksLastExport } from '@/hooks/useExportToQuickBooks';
import { useAppToast } from '@/hooks/useAppToast';
import { isQuickBooksEnabled } from '@/lib/flags';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import type { QuickBooksExportLog } from '@/services/quickbooks/quickbooksService';

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
  showStatusDetails = false
}) => {
  const { currentOrganization } = useOrganization();
  const { success: showSuccessToast, error: showErrorToast } = useAppToast();

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
  const { data: existingExport } = useQuickBooksLastExport(
    workOrderId,
    !!workOrderId && canExport && featureEnabled && connectionStatus?.isConnected
  );

  const shouldLoadStatusDetails = Boolean(
    showStatusDetails && !asMenuItem && workOrderId && canExport && featureEnabled && connectionStatus?.isConnected
  );

  const { data: exportLogs = [] } = useQuickBooksExportLogs(
    workOrderId,
    shouldLoadStatusDetails
  );

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
  // Only show invoice label when we have valid identifiers; otherwise treat as no export for display
  // This avoids confusing "Update Invoice Unknown" text for malformed/incomplete export records
  const hasInvoiceIdentifiers = Boolean(
    existingExport?.quickbooks_invoice_number || existingExport?.quickbooks_invoice_id
  );
  const invoiceDisplay = alreadyExported && hasInvoiceIdentifiers
    ? (existingExport.quickbooks_invoice_number || existingExport.quickbooks_invoice_id)
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
  } else if (alreadyExported && hasInvoiceIdentifiers) {
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

  // Use hasInvoiceIdentifiers for display consistency - malformed exports show as new export
  const showAsUpdate = alreadyExported && hasInvoiceIdentifiers;

  const latestLog = exportLogs[0] ?? null;

  const getStatusBadgeClass = (status?: QuickBooksExportLog['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status?: QuickBooksExportLog['status']) => {
    switch (status) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'pending':
        return 'Pending';
      default:
        return 'Not exported';
    }
  };

  const formatTimestamp = (log: QuickBooksExportLog) => {
    const timestamp = log.exported_at ?? log.created_at;
    return timestamp ? new Date(timestamp).toLocaleString() : 'Unknown';
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

  const renderStatusDetails = () => {
    if (!showStatusDetails || asMenuItem) {
      return null;
    }

    const statusLabel = getStatusLabel(latestLog?.status);
    const invoiceIdentifier = latestLog?.quickbooks_invoice_number || latestLog?.quickbooks_invoice_id;
    const hasInvoiceLink = latestLog?.quickbooks_invoice_id && latestLog?.quickbooks_environment;
    const historyLogs = exportLogs.slice(0, 3);

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" aria-label="QuickBooks export status">
            <Info className="h-4 w-4" />
            <span>QB Status</span>
            <Badge variant="outline" className={getStatusBadgeClass(latestLog?.status)}>
              {statusLabel}
            </Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96">
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">Last export</div>
              {latestLog ? (
                <div className="text-sm text-muted-foreground">
                  {statusLabel} • {formatTimestamp(latestLog)}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Not exported yet</div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Invoice</div>
              {invoiceIdentifier ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{invoiceIdentifier}</span>
                  {hasInvoiceLink ? (
                    <Button variant="link" size="sm" asChild>
                      <a
                        href={getQuickBooksInvoiceUrl(
                          latestLog!.quickbooks_invoice_id!,
                          latestLog!.quickbooks_environment!
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open in QuickBooks
                      </a>
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No invoice created yet</div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">PDF attachment</div>
              {latestLog?.pdf_attachment_status ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClass(
                        latestLog.pdf_attachment_status === 'success'
                          ? 'success'
                          : latestLog.pdf_attachment_status === 'failed'
                          ? 'error'
                          : undefined
                      )}
                    >
                      {latestLog.pdf_attachment_status === 'disabled'
                        ? 'Disabled'
                        : latestLog.pdf_attachment_status}
                    </Badge>
                    {latestLog.pdf_attachment_status === 'failed' && latestLog.pdf_attachment_error ? (
                      <span className="text-xs text-muted-foreground">
                        {latestLog.pdf_attachment_error}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Not applicable</div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Troubleshooting</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between gap-2">
                  <span>Intuit trace ID</span>
                  {latestLog?.intuit_tid ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy('Intuit trace ID', latestLog.intuit_tid)}
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not available</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>PDF trace ID</span>
                  {latestLog?.pdf_attachment_intuit_tid ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy('PDF trace ID', latestLog.pdf_attachment_intuit_tid)}
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not available</span>
                  )}
                </div>
              </div>
            </div>

            {historyLogs.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">Recent exports</div>
                <div className="space-y-2">
                  {historyLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStatusBadgeClass(log.status)}>
                          {getStatusLabel(log.status)}
                        </Badge>
                        <span className="text-muted-foreground">
                          {log.quickbooks_invoice_number || log.quickbooks_invoice_id || 'Draft'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatTimestamp(log)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isDisabled || isLoading}
              >
                {isDisabled ? 'Unavailable' : 'Retry export'}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const buttonContent = (
    <>
      {isLoading ? (
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
      ) : showAsUpdate ? (
        <CheckCircle className="h-4 w-4 mr-2" />
      ) : isDisabled ? (
        <AlertTriangle className="h-4 w-4 mr-2" />
      ) : (
        <FileSpreadsheet className="h-4 w-4 mr-2" />
      )}
      {showAsUpdate ? `Update Invoice ${invoiceDisplay}` : 'Export to QuickBooks'}
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
        {renderStatusDetails()}
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
      {renderStatusDetails()}
    </TooltipProvider>
  );
};

export default QuickBooksExportButton;
