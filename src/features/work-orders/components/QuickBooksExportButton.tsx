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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, RefreshCw, CheckCircle, ExternalLink, Info, Copy } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useQuery } from '@tanstack/react-query';
import { getConnectionStatus, getTeamCustomerMapping } from '@/services/quickbooks';
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

type ExistingExportLike =
  | Pick<QuickBooksExportLog, 'quickbooks_invoice_number' | 'quickbooks_invoice_id' | 'quickbooks_environment'>
  | null
  | undefined;

export function getQuickBooksInvoiceDisplay(existingExport: ExistingExportLike) {
  const alreadyExported = !!existingExport;
  const hasInvoiceIdentifiers = Boolean(
    existingExport?.quickbooks_invoice_number || existingExport?.quickbooks_invoice_id
  );
  const invoiceDisplay =
    alreadyExported && hasInvoiceIdentifiers
      ? existingExport!.quickbooks_invoice_number || existingExport!.quickbooks_invoice_id
      : null;

  return { alreadyExported, hasInvoiceIdentifiers, invoiceDisplay };
}

interface QuickBooksExportAvailabilityInput {
  isCompleted: boolean;
  isConnected: boolean | undefined;
  hasTeam: boolean;
  hasMapping: boolean;
  isExporting: boolean;
  alreadyExported: boolean;
  hasInvoiceIdentifiers: boolean;
  invoiceDisplay: string | null | undefined;
}

export function getQuickBooksExportAvailability(input: QuickBooksExportAvailabilityInput) {
  const {
    isCompleted,
    isConnected,
    hasTeam,
    hasMapping,
    isExporting,
    alreadyExported,
    hasInvoiceIdentifiers,
    invoiceDisplay,
  } = input;

  let tooltipMessage: string;
  let isDisabled = false;

  if (!isCompleted) {
    tooltipMessage = 'Complete this work order first, then export to QuickBooks.';
    isDisabled = true;
  } else if (!isConnected) {
    tooltipMessage =
      'QuickBooks is not connected. Go to Organization Settings > Integrations to connect QuickBooks.';
    isDisabled = true;
  } else if (!hasTeam) {
    tooltipMessage = 'Assign this equipment to a team before exporting to QuickBooks.';
    isDisabled = true;
  } else if (!hasMapping) {
    tooltipMessage =
      "This team's QuickBooks customer mapping is missing. Set it in Team Settings > QuickBooks.";
    isDisabled = true;
  } else if (isExporting) {
    tooltipMessage = 'Exporting...';
    isDisabled = true;
  } else if (alreadyExported && hasInvoiceIdentifiers) {
    tooltipMessage = `Previously exported as Invoice ${invoiceDisplay}. Click to update.`;
  } else {
    tooltipMessage = 'Export work order as a draft invoice in QuickBooks';
  }

  const showAsUpdate = alreadyExported && hasInvoiceIdentifiers;
  const showSetupState = isDisabled && isCompleted && (!isConnected || !hasTeam || !hasMapping);

  return { tooltipMessage, isDisabled, showAsUpdate, showSetupState };
}

export function getQuickBooksExportStatusBadgeClass(status?: QuickBooksExportLog['status']) {
  switch (status) {
    case 'success':
      return 'bg-success/10 text-success border-success/30';
    case 'error':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'pending':
      return 'bg-warning/10 text-warning border-warning/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function getQuickBooksExportStatusLabel(status?: QuickBooksExportLog['status']) {
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
}

interface QuickBooksExportButtonContentProps {
  isLoading: boolean;
  showAsUpdate: boolean;
  isDisabled: boolean;
  showSetupState: boolean;
  invoiceDisplay: string | null | undefined;
}

export function QuickBooksExportButtonContent({
  isLoading,
  showAsUpdate,
  isDisabled,
  showSetupState,
  invoiceDisplay,
}: QuickBooksExportButtonContentProps) {
  return (
    <>
      {isLoading ? (
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
      ) : showAsUpdate ? (
        <CheckCircle className="h-4 w-4 mr-2" />
      ) : isDisabled ? (
        <Info className="h-4 w-4 mr-2" />
      ) : (
        <FileSpreadsheet className="h-4 w-4 mr-2" />
      )}
      {showAsUpdate
        ? `Update Invoice ${invoiceDisplay}`
        : showSetupState
          ? 'QuickBooks Setup Required'
          : 'Export to QuickBooks'}
    </>
  );
}

interface QuickBooksExportStatusDetailsProps {
  showStatusDetails: boolean;
  asMenuItem: boolean;
  latestLog: QuickBooksExportLog | null;
  exportLogs: QuickBooksExportLog[];
  isDisabled: boolean;
  isLoading: boolean;
  onRetryExport: () => void;
  onCopy: (label: string, value?: string | null) => void;
  formatTimestamp: (log: QuickBooksExportLog) => string;
}

export function QuickBooksExportStatusDetails({
  showStatusDetails,
  asMenuItem,
  latestLog,
  exportLogs,
  isDisabled,
  isLoading,
  onRetryExport,
  onCopy,
  formatTimestamp,
}: QuickBooksExportStatusDetailsProps) {
  if (!showStatusDetails || asMenuItem) {
    return null;
  }

  const statusLabel = getQuickBooksExportStatusLabel(latestLog?.status);
  const invoiceIdentifier = latestLog?.quickbooks_invoice_number || latestLog?.quickbooks_invoice_id;
  const hasInvoiceLink = latestLog?.quickbooks_invoice_id && latestLog?.quickbooks_environment;
  const historyLogs = exportLogs.slice(0, 3);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label="QuickBooks export status">
          <Info className="h-4 w-4" />
          <span>QB Status</span>
          <Badge variant="outline" className={getQuickBooksExportStatusBadgeClass(latestLog?.status)}>
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
                      aria-label="Open in QuickBooks (opens in new tab)"
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
            <div className="text-sm font-medium">Troubleshooting</div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <span>Intuit trace ID</span>
                {latestLog?.intuit_tid ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCopy('Intuit trace ID', latestLog.intuit_tid)}
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
                      <Badge variant="outline" className={getQuickBooksExportStatusBadgeClass(log.status)}>
                        {getQuickBooksExportStatusLabel(log.status)}
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
            <Button variant="outline" size="sm" onClick={onRetryExport} disabled={isDisabled || isLoading}>
              {isDisabled ? 'Unavailable' : 'Retry export'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
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

  const { data: teamMapping, isLoading: mappingLoading } = useQuery({
    queryKey: ['quickbooks', 'team-mapping', currentOrganization?.id, teamId],
    queryFn: () => getTeamCustomerMapping(currentOrganization!.id, teamId!),
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
  const hasMapping = !!teamMapping;
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
