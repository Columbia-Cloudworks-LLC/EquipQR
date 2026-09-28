import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useExportToQuickBooks } from '@/hooks/useExportToQuickBooks';
import {
  getInvoiceReview, saveInvoiceDates, calculateInvoiceDueDate,
  type InvoiceDates, type InvoiceReview,
} from '@/services/quickbooks/invoiceReview';

interface Props {
  workOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExportSuccess?: () => void;
}

function InvoiceReviewForm({ review, workOrderId, onClose, onExportSuccess }: {
  review: InvoiceReview;
  workOrderId: string;
  onClose: () => void;
  onExportSuccess?: () => void;
}) {
  const { currentOrganization } = useOrganization();
  const existing = review.existing_invoice;
  const [dates, setDates] = useState<InvoiceDates>(() => ({
    invoice_date: existing ? existing.invoice_date : review.saved_details?.invoice_date ?? null,
    due_date: existing ? existing.due_date : review.saved_details?.due_date ?? null,
    payment_term_id: existing ? existing.payment_term_id : review.saved_details ? review.saved_details.payment_term_id : review.customer_term_id,
    service_dates: Object.fromEntries(review.services.map((service) => [
      service.key, service.service_date ?? review.saved_details?.service_dates[service.key] ?? '',
    ])),
  }));
  const [replaceDates, setReplaceDates] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exportMutation = useExportToQuickBooks();
  const datesLocked = Boolean(existing && !replaceDates);
  const pending = saving || exportMutation.isPending;
  const complete = Boolean(dates.invoice_date && dates.due_date && review.services.every(
    (service) => dates.service_dates[service.key],
  ));

  const editDates = (next: Partial<InvoiceDates>) => {
    setDates((current) => ({ ...current, ...next }));
    setSaved(false);
  };
  const save = async () => {
    if (!currentOrganization) throw new Error('Select an organization first');
    await saveInvoiceDates(workOrderId, currentOrganization.id, dates);
    setSaved(true);
  };
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try { await save(); } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save invoice details');
    } finally { setSaving(false); }
  };
  const handleExport = async () => {
    setSaving(true);
    setError(null);
    try {
      await save();
      await exportMutation.mutateAsync({
        workOrderId,
        confirmation: {
          ...dates,
          source_fingerprint: review.source_fingerprint,
          existing_invoice_id: existing?.id ?? null,
          existing_sync_token: existing?.sync_token ?? null,
          overwrite_existing_dates: replaceDates,
        },
      });
      onExportSuccess?.();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not export invoice');
    } finally { setSaving(false); }
  };
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Choose the dates your customer should see. Work order entry time and scheduling deadlines are not used.</p>
      {existing && <div className="rounded-md border p-3 text-sm space-y-2">
        <p>Showing the current QuickBooks invoice dates. Existing prices and service dates are preserved.</p>
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={replaceDates} disabled={pending} onChange={(event) => {
            const replace = event.target.checked;
            setReplaceDates(replace);
            setSaved(false);
            if (!replace) {
              editDates({
                invoice_date: existing.invoice_date,
                due_date: existing.due_date,
                payment_term_id: existing.payment_term_id,
              });
            }
          }} />
          Replace QuickBooks invoice date, payment terms, and due date with my selections
        </label>
      </div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="invoice-date">Invoice date</Label>
          <Input id="invoice-date" type="date" value={dates.invoice_date ?? ''} disabled={datesLocked || pending}
            onChange={(event) => editDates({ invoice_date: event.target.value || null })} />
          <p className="text-xs text-muted-foreground">The billing date shown on the invoice.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="payment-terms">Payment terms</Label>
          <select id="payment-terms" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={dates.payment_term_id ?? ''} disabled={datesLocked || pending}
            onChange={(event) => editDates({ payment_term_id: event.target.value || null })}>
            <option value="" disabled={Boolean(existing?.payment_term_id)}>No terms — choose a due date</option>
            {review.terms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">The agreed terms sent to QuickBooks.</p>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="invoice-due-date">Due date</Label>
          <Input id="invoice-due-date" type="date" value={dates.due_date ?? ''} disabled={datesLocked || pending}
            onChange={(event) => editDates({ due_date: event.target.value || null })} />
          <p className="text-xs text-muted-foreground">Payment due date shown to your customer. This is separate from the work order due date.</p>
          {!datesLocked && <Button type="button" variant="outline" size="sm" disabled={!dates.invoice_date || !dates.payment_term_id || pending}
            onClick={() => {
              const term = review.terms.find((item) => item.id === dates.payment_term_id);
              if (term && dates.invoice_date) {
                const due = calculateInvoiceDueDate(dates.invoice_date, term);
                if (due) editDates({ due_date: due });
                else setError('Choose a due date for these payment terms.');
              }
            }}>Calculate from invoice date and terms</Button>}
        </div>
      </div>
      <div className="space-y-3">
        <p className="font-medium">Services on this invoice</p>
        {review.services.map((service, index) => <div key={service.key} className="rounded-md border p-3 space-y-2">
          <p className="font-medium break-words">{service.description}</p>
          <p className="text-sm text-muted-foreground">Quantity {service.quantity} · Unit price {service.unit_price.toFixed(2)} · Amount {service.amount.toFixed(2)}</p>
          <Label htmlFor={`service-date-${index}`}>Service date</Label>
          <Input id={`service-date-${index}`} type="date" value={dates.service_dates[service.key] ?? ''}
            disabled={pending || Boolean(existing && service.service_date)}
            onChange={(event) => editDates({ service_dates: { ...dates.service_dates, [service.key]: event.target.value } })} />
          <p className="text-xs text-muted-foreground">When this service was performed. QuickBooks can show it in the service-line Date column.</p>
        </div>)}
        <p className="text-xs text-muted-foreground">Service dates require the QuickBooks invoice template's Service date option. On a phone, dates may appear inside invoice details rather than the initial payment screen.</p>
      </div>
      <p className="rounded-md bg-muted p-3 text-sm">PM prices start at $0. Review and set your standard PM price in QuickBooks before sending. Export does not send an invoice; new invoices have online payments disabled for this review step.</p>
      {review.blocking_reason && <p role="alert" className="text-sm text-destructive">{review.blocking_reason}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {saved && <p role="status" className="text-sm">Invoice details saved.</p>}
      {!complete && <p className="text-sm text-muted-foreground">Choose an invoice date, due date, and a service date for each line before exporting.</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
        <Button variant="outline" onClick={handleSave} disabled={pending}>Save details</Button>
        <Button onClick={handleExport} disabled={pending || !complete || Boolean(review.blocking_reason)}>
          {pending ? 'Working…' : existing ? 'Confirm and update invoice' : 'Confirm and create invoice'}
        </Button>
      </div>
    </div>
  );
}

export function InvoiceReviewDialog({ workOrderId, open, onOpenChange, onExportSuccess }: Props) {
  const review = useQuery({
    queryKey: ['quickbooks', 'invoice-review', workOrderId],
    queryFn: () => getInvoiceReview(workOrderId),
    enabled: open,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" onClick={(event) => event.stopPropagation()}>
      <DialogHeader>
        <DialogTitle>Review invoice details</DialogTitle>
        <DialogDescription>Check what will appear on the customer invoice before exporting to QuickBooks.</DialogDescription>
      </DialogHeader>
      {review.isFetching ? <p role="status">Loading invoice details…</p> : review.error ? <div className="space-y-3">
        <p role="alert">{review.error.message}</p>
        <Button variant="outline" onClick={() => review.refetch()}>Try again</Button>
      </div> : review.data && <InvoiceReviewForm key={review.dataUpdatedAt} review={review.data} workOrderId={workOrderId}
        onClose={() => onOpenChange(false)} onExportSuccess={onExportSuccess} />}
    </DialogContent>
  </Dialog>;
}
