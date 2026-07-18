/**
 * QuickBooks Types Tests
 * 
 * Tests for utility functions in quickbooks/types.ts
 */

import { describe, it, expect } from 'vitest';
import { getQuickBooksInvoiceUrl } from '@/services/quickbooks/types';

describe('getQuickBooksInvoiceUrl', () => {
  describe('sandbox environment', () => {
    it('should construct correct sandbox URL for invoice', () => {
      const url = getQuickBooksInvoiceUrl('12345', 'sandbox');
      expect(url).toBe('https://app.sandbox.qbo.intuit.com/app/invoice?txnId=12345');
    });

    it('should handle different invoice IDs in sandbox', () => {
      const url = getQuickBooksInvoiceUrl('inv-abc-123', 'sandbox');
      expect(url).toBe('https://app.sandbox.qbo.intuit.com/app/invoice?txnId=inv-abc-123');
    });
  });

  describe('production environment', () => {
    it('should construct correct production URL for invoice', () => {
      const url = getQuickBooksInvoiceUrl('67890', 'production');
      expect(url).toBe('https://app.qbo.intuit.com/app/invoice?txnId=67890');
    });

    it('should handle different invoice IDs in production', () => {
      const url = getQuickBooksInvoiceUrl('prod-xyz-456', 'production');
      expect(url).toBe('https://app.qbo.intuit.com/app/invoice?txnId=prod-xyz-456');
    });
  });

  describe('edge cases', () => {
    it('should handle numeric invoice IDs', () => {
      const sandboxUrl = getQuickBooksInvoiceUrl('1', 'sandbox');
      const productionUrl = getQuickBooksInvoiceUrl('999999', 'production');
      
      expect(sandboxUrl).toBe('https://app.sandbox.qbo.intuit.com/app/invoice?txnId=1');
      expect(productionUrl).toBe('https://app.qbo.intuit.com/app/invoice?txnId=999999');
    });

    it('should handle empty invoice ID', () => {
      const url = getQuickBooksInvoiceUrl('', 'sandbox');
      expect(url).toBe('https://app.sandbox.qbo.intuit.com/app/invoice?txnId=');
    });
  });
});
