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

export const QUICKBOOKS_SYNC_EXCLUDED_MESSAGE =
  'Marked Historical Only / Do Not Sync (already billed). Turn on "Ready to sync / bill in QuickBooks" to export.';

export interface QuickBooksExportAvailabilityInput {
  isCompleted: boolean;
  isConnected: boolean | undefined;
  hasTeam: boolean;
  hasMapping: boolean;
  isExporting: boolean;
  alreadyExported: boolean;
  hasInvoiceIdentifiers: boolean;
  invoiceDisplay: string | null | undefined;
  /** Work order is flagged "Historical Only / Do Not Sync". */
  syncExcluded?: boolean;
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
    syncExcluded = false,
  } = input;

  let tooltipMessage: string;
  let isDisabled = false;

  if (syncExcluded) {
    tooltipMessage = QUICKBOOKS_SYNC_EXCLUDED_MESSAGE;
    isDisabled = true;
  } else if (!isCompleted) {
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
  const showSetupState =
    isDisabled && !syncExcluded && isCompleted && (!isConnected || !hasTeam || !hasMapping);

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
