import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithQuickBooksProviders } from '@/services/quickbooks/quickbooksTestUtils';
import { InvoiceReviewDialog } from './InvoiceReviewDialog';
import { getInvoiceReview, saveInvoiceDates, type InvoiceReview } from '@/services/quickbooks/invoiceReview';

const { exportInvoice } = vi.hoisted(() => ({ exportInvoice: vi.fn() }));
vi.mock('@/hooks/useExportToQuickBooks', () => ({ useExportToQuickBooks: () => ({ mutateAsync: exportInvoice, isPending: false }) }));
vi.mock('@/contexts/OrganizationContext', () => ({ useOrganization: () => ({ currentOrganization: { id: 'org-1' } }) }));
vi.mock('@/services/quickbooks/invoiceReview', async (original) => ({
  ...await original<typeof import('@/services/quickbooks/invoiceReview')>(),
  getInvoiceReview: vi.fn(), saveInvoiceDates: vi.fn(),
}));
const empty: InvoiceReview = {
  source_fingerprint: 'source-v1',
  saved_details: null, existing_invoice: null, customer_term_id: '1', blocking_reason: null,
  terms: [{ id: '1', name: 'Net 30', due_days: 30, day_of_month_due: null, due_next_month_days: null }],
  services: [{ key: 'pm:1', description: 'PM — 500-hour service', service_date: null, quantity: 1, unit_price: 0, amount: 0 }],
};
const renderDialog = () => renderWithQuickBooksProviders(<InvoiceReviewDialog workOrderId="wo-1" open onOpenChange={vi.fn()} />);
describe('invoice review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getInvoiceReview).mockResolvedValue(empty);
    vi.mocked(saveInvoiceDates).mockResolvedValue(undefined);
    exportInvoice.mockResolvedValue({ success: true });
  });
  it('starts business dates blank and never exports just by opening', async () => {
    renderDialog();
    expect(await screen.findByLabelText('Invoice date')).toHaveValue('');
    expect(screen.getByLabelText('Due date')).toHaveValue('');
    expect(screen.getByLabelText('Service date')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Confirm and create invoice' })).toBeDisabled();
    expect(exportInvoice).not.toHaveBeenCalled();
  });
  it('saves and exports the exact historical dates confirmed by the operator', async () => {
    renderDialog();
    fireEvent.change(await screen.findByLabelText('Invoice date'), { target: { value: '2020-09-21' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate from invoice date and terms' }));
    expect(screen.getByLabelText('Due date')).toHaveValue('2020-10-21');
    fireEvent.change(screen.getByLabelText('Service date'), { target: { value: '2020-08-05' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and create invoice' }));
    await waitFor(() => expect(exportInvoice).toHaveBeenCalledWith({
      workOrderId: 'wo-1', confirmation: {
        source_fingerprint: 'source-v1',
        invoice_date: '2020-09-21', due_date: '2020-10-21', payment_term_id: '1',
        service_dates: { 'pm:1': '2020-08-05' }, existing_invoice_id: null,
        existing_sync_token: null, overwrite_existing_dates: false,
      },
    }));
    expect(saveInvoiceDates).toHaveBeenCalled();
  });
  it('preserves QuickBooks edits by default and requires an explicit header override', async () => {
    vi.mocked(getInvoiceReview).mockResolvedValue({ ...empty,
      existing_invoice: { id: 'q1', sync_token: '3', invoice_date: '2020-09-22', due_date: '2020-10-22', payment_term_id: null },
      services: [{ ...empty.services[0], service_date: '2020-08-06', unit_price: 500, amount: 500 }],
    });
    renderDialog();
    expect(await screen.findByLabelText('Invoice date')).toHaveValue('2020-09-22');
    expect(screen.getByLabelText('Invoice date')).toBeDisabled();
    expect(screen.getByLabelText('Payment terms')).toHaveValue('');
    expect(screen.getByLabelText('Service date')).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByLabelText('Invoice date')).toBeEnabled();
    expect(screen.getByLabelText('Service date')).toBeDisabled();
  });
  it('blocks export for unsafe existing invoices', async () => {
    vi.mocked(getInvoiceReview).mockResolvedValue({ ...empty, blocking_reason: 'Review/update this invoice in QuickBooks.' });
    renderDialog();
    expect(await screen.findByRole('alert')).toHaveTextContent('Review/update this invoice in QuickBooks.');
    expect(screen.getByRole('button', { name: 'Confirm and create invoice' })).toBeDisabled();
  });
  it('restores QuickBooks header values when the operator cancels replacement after saving edits', async () => {
    vi.mocked(getInvoiceReview).mockResolvedValue({ ...empty,
      existing_invoice: { id: 'q1', sync_token: '3', invoice_date: '2020-09-22', due_date: '2020-10-22', payment_term_id: null },
      services: [{ ...empty.services[0], service_date: '2020-08-06', unit_price: 500, amount: 500 }],
    });
    renderDialog();
    await screen.findByLabelText('Invoice date');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('Invoice date'), { target: { value: '2020-09-23' } });
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2020-10-23' } });
    fireEvent.change(screen.getByLabelText('Payment terms'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save details' }));
    await screen.findByText('Invoice details saved.');
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByLabelText('Invoice date')).toHaveValue('2020-09-22');
    expect(screen.getByLabelText('Invoice date')).toBeDisabled();
    expect(screen.getByLabelText('Due date')).toHaveValue('2020-10-22');
    expect(screen.getByLabelText('Payment terms')).toHaveValue('');
    expect(screen.queryByText('Invoice details saved.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and update invoice' }));
    await waitFor(() => expect(exportInvoice).toHaveBeenCalledWith({ workOrderId: 'wo-1', confirmation: {
      source_fingerprint: 'source-v1', invoice_date: '2020-09-22', due_date: '2020-10-22', payment_term_id: null,
      service_dates: { 'pm:1': '2020-08-06' }, existing_invoice_id: 'q1', existing_sync_token: '3', overwrite_existing_dates: false,
    } }));
  });
});
