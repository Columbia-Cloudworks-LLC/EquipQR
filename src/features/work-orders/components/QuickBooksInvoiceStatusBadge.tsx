import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import type { QuickBooksInvoiceStatus } from '@/features/work-orders/types/workOrder';

interface QuickBooksInvoiceStatusBadgeProps {
  status?: QuickBooksInvoiceStatus | null;
  invoiceNumber?: string | null;
  balanceCents?: number | null;
  paidAt?: string | null;
  className?: string;
}

const statusClasses: Record<QuickBooksInvoiceStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  sent: 'bg-info/10 text-info border-info/30',
  viewed: 'bg-info/10 text-info border-info/30',
  paid: 'bg-success/10 text-success border-success/30',
  partially_paid: 'bg-warning/10 text-warning border-warning/30',
  overdue: 'bg-destructive/10 text-destructive border-destructive/30',
  voided: 'bg-muted text-muted-foreground border-border',
};

function formatStatusLabel(status: QuickBooksInvoiceStatus): string {
  switch (status) {
    case 'draft':
      return 'Invoice Draft';
    case 'sent':
      return 'Awaiting Payment';
    case 'viewed':
      return 'Viewed';
    case 'paid':
      return 'Paid';
    case 'partially_paid':
      return 'Partially Paid';
    case 'overdue':
      return 'Invoice Overdue';
    case 'voided':
      return 'Invoice Voided';
    default:
      return status;
  }
}

export const QuickBooksInvoiceStatusBadge: React.FC<QuickBooksInvoiceStatusBadgeProps> = ({
  status,
  invoiceNumber,
  balanceCents,
  paidAt,
  className,
}) => {
  const { formatDate } = useFormatTimestamp();

  if (!status) return null;

  const parts = [formatStatusLabel(status)];
  if (status === 'paid' && paidAt) {
    parts.push(formatDate(paidAt));
  } else if (status !== 'paid' && typeof balanceCents === 'number' && balanceCents > 0) {
    parts.push(`$${(balanceCents / 100).toFixed(2)}`);
  }
  if (invoiceNumber) {
    parts.push(`#${invoiceNumber}`);
  }

  return (
    <Badge variant="outline" className={cn('text-xs whitespace-nowrap', statusClasses[status], className)}>
      {parts.join(' - ')}
    </Badge>
  );
};

export default QuickBooksInvoiceStatusBadge;
