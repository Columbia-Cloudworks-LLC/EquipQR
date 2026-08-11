import { describe, expect, it } from 'vitest';
import {
  getQuickBooksExportAvailability,
  getQuickBooksExportStatusBadgeClass,
  getQuickBooksExportStatusLabel,
  getQuickBooksInvoiceDisplay,
} from '@/features/work-orders/components/quickBooksExportPresentation';

describe('getQuickBooksInvoiceDisplay', () => {
  it('returns no export state when existing export is absent', () => {
    expect(getQuickBooksInvoiceDisplay(null)).toEqual({
      alreadyExported: false,
      hasInvoiceIdentifiers: false,
      invoiceDisplay: null,
    });
  });

  it('prefers invoice number over invoice id for display', () => {
    expect(
      getQuickBooksInvoiceDisplay({
        quickbooks_invoice_number: 'INV-100',
        quickbooks_invoice_id: '123',
        quickbooks_environment: 'sandbox',
      })
    ).toEqual({
      alreadyExported: true,
      hasInvoiceIdentifiers: true,
      invoiceDisplay: 'INV-100',
    });
  });
});

describe('getQuickBooksExportAvailability', () => {
  const baseInput = {
    isCompleted: true,
    isConnected: true,
    hasTeam: true,
    hasMapping: true,
    isExporting: false,
    alreadyExported: false,
    hasInvoiceIdentifiers: false,
    invoiceDisplay: null,
  };

  it('blocks export when the work order is not completed', () => {
    const result = getQuickBooksExportAvailability({
      ...baseInput,
      isCompleted: false,
    });

    expect(result.isDisabled).toBe(true);
    expect(result.showSetupState).toBe(false);
    expect(result.tooltipMessage).toContain('Complete this work order first');
  });

  it('shows setup state when QuickBooks is disconnected', () => {
    const result = getQuickBooksExportAvailability({
      ...baseInput,
      isConnected: false,
    });

    expect(result.isDisabled).toBe(true);
    expect(result.showSetupState).toBe(true);
    expect(result.tooltipMessage).toContain('QuickBooks is not connected');
  });

  it('shows update messaging when an invoice already exists', () => {
    const result = getQuickBooksExportAvailability({
      ...baseInput,
      alreadyExported: true,
      hasInvoiceIdentifiers: true,
      invoiceDisplay: 'INV-200',
    });

    expect(result.isDisabled).toBe(false);
    expect(result.showAsUpdate).toBe(true);
    expect(result.tooltipMessage).toContain('Previously exported as Invoice INV-200');
  });
});

describe('getQuickBooksExportStatusLabel', () => {
  it('maps known statuses and falls back for unknown values', () => {
    expect(getQuickBooksExportStatusLabel('success')).toBe('Success');
    expect(getQuickBooksExportStatusLabel('error')).toBe('Error');
    expect(getQuickBooksExportStatusLabel('pending')).toBe('Pending');
    expect(getQuickBooksExportStatusLabel(undefined)).toBe('Not exported');
  });
});

describe('getQuickBooksExportStatusBadgeClass', () => {
  it('returns semantic classes for known statuses', () => {
    expect(getQuickBooksExportStatusBadgeClass('success')).toContain('bg-success/10');
    expect(getQuickBooksExportStatusBadgeClass('error')).toContain('bg-destructive/10');
    expect(getQuickBooksExportStatusBadgeClass('pending')).toContain('bg-warning/10');
    expect(getQuickBooksExportStatusBadgeClass(undefined)).toContain('bg-muted');
  });
});
