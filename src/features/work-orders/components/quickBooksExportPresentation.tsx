import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileSpreadsheet, RefreshCw, CheckCircle, Info, Copy } from 'lucide-react';
import { getQuickBooksInvoiceUrl } from '@/services/quickbooks/types';
import type { QuickBooksExportLog } from '@/services/quickbooks/quickbooksService';

export type ExistingExportLike =
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

export interface QuickBooksExportAvailabilityInput {
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

export interface QuickBooksExportButtonContentProps {
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

export interface QuickBooksExportStatusDetailsProps {
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
