const INVOICE_FILTER_LABELS: Record<string, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
  not_exported: 'Not exported',
};

/** User-facing label for work-order invoice filter badges (matches select item copy). */
export function formatInvoiceFilterLabel(value: string): string {
  return INVOICE_FILTER_LABELS[value] ?? value;
}
