/**
 * Decides which first-write timestamps (invoice_sent_at / invoice_paid_at)
 * a work order invoice mirror update should set, given the QuickBooks invoice
 * and its derived status. Shared by the export mirror and the status sync.
 */
export function deriveInvoiceMirrorTimestamps(
  invoice: { EmailStatus?: string },
  invoiceStatus: string,
  now: Date,
): { shouldSetSent: boolean; shouldSetPaid: boolean; timestamp: string } {
  const wasEmailed = invoice.EmailStatus?.toLowerCase() === "emailsent";
  return {
    shouldSetSent: wasEmailed && invoiceStatus !== "draft" && invoiceStatus !== "voided",
    shouldSetPaid: invoiceStatus === "paid",
    timestamp: now.toISOString(),
  };
}
