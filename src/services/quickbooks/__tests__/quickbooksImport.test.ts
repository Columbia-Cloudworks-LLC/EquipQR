import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@/test/utils/mock-supabase';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

import { supabase } from '@/integrations/supabase/client';
import {
  importCustomerFromQB,
  refreshCustomerFromQB,
  resolveQuickBooksCustomerId,
} from '@/features/teams/services/customerAccountService';
import type { QBCustomerPayload } from '@/features/teams/services/customerAccountService';

const mockFrom = vi.mocked(supabase.from);

describe('QuickBooks Import', () => {
  const orgId = 'org-123';

  const sampleQBPayload: QBCustomerPayload = {
    Id: 'qb-42',
    DisplayName: 'Acme Corp',
    CompanyName: 'Acme Corporation',
    Email: 'billing@acme.com',
    Phone: '555-123-4567',
    BillAddr: {
      Line1: '100 Main St',
      City: 'Dallas',
      State: 'TX',
      Country: 'US',
      PostalCode: '75201',
    },
    ShipAddr: {
      Line1: '200 Warehouse Blvd',
      City: 'Fort Worth',
      State: 'TX',
      Country: 'US',
      PostalCode: '76102',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('importCustomerFromQB', () => {
    it('should map QB fields to customer insert payload', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'cust-1', name: 'Acme Corp', organization_id: orgId },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockChain as never);

      await importCustomerFromQB(orgId, sampleQBPayload);

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: orgId,
          name: 'Acme Corp',
          email: 'billing@acme.com',
          phone: '555-123-4567',
          quickbooks_customer_id: 'qb-42',
          quickbooks_display_name: 'Acme Corp',
          status: 'active',
          billing_address: expect.objectContaining({
            line1: '100 Main St',
            city: 'Dallas',
            state: 'TX',
          }),
          shipping_address: expect.objectContaining({
            line1: '200 Warehouse Blvd',
            city: 'Fort Worth',
          }),
        })
      );
    });

    it('should handle null optional fields gracefully', async () => {
      const minPayload: QBCustomerPayload = {
        Id: 'qb-99',
        DisplayName: 'Minimal Customer',
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'cust-2', name: 'Minimal Customer' },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockChain as never);

      await importCustomerFromQB(orgId, minPayload);

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Minimal Customer',
          email: null,
          phone: null,
          billing_address: null,
          shipping_address: null,
        })
      );
    });
  });

  describe('refreshCustomerFromQB', () => {
    it('should update only QB-sourced fields', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'cust-1', name: 'Acme Corp' },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockChain as never);

      await refreshCustomerFromQB('cust-1', sampleQBPayload);

      const updateArg = mockChain.update.mock.calls[0][0];
      expect(updateArg.email).toBe('billing@acme.com');
      expect(updateArg.phone).toBe('555-123-4567');
      expect(updateArg.quickbooks_display_name).toBe('Acme Corp');
      expect(updateArg.quickbooks_synced_at).toBeDefined();
      // Should NOT include name, notes, account_owner_id, or status
      expect(updateArg).not.toHaveProperty('name');
      expect(updateArg).not.toHaveProperty('notes');
      expect(updateArg).not.toHaveProperty('account_owner_id');
      expect(updateArg).not.toHaveProperty('status');
    });
  });

  describe('resolveQuickBooksCustomerId', () => {
    it('should resolve via team → customer account first', async () => {
      const calls: string[] = [];

      mockFrom.mockImplementation((table: string) => {
        calls.push(table);
        if (table === 'teams') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { customer_id: 'cust-1' },
              error: null,
            }),
          } as never;
        }
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { quickbooks_customer_id: 'qb-42' },
              error: null,
            }),
          } as never;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as never;
      });

      const result = await resolveQuickBooksCustomerId(orgId, 'team-1');

      expect(result).toBe('qb-42');
      expect(calls).toContain('teams');
      expect(calls).toContain('customers');
      expect(calls).not.toContain('quickbooks_team_customers');
    });

    it('should fall back to legacy mapping when customer account has no QB ID', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'teams') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { customer_id: null },
              error: null,
            }),
          } as never;
        }
        if (table === 'quickbooks_team_customers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { quickbooks_customer_id: 'qb-legacy-99' },
              error: null,
            }),
          } as never;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as never;
      });

      const result = await resolveQuickBooksCustomerId(orgId, 'team-2');

      expect(result).toBe('qb-legacy-99');
    });

    it('should return null when no mapping exists at all', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }) as never);

      const result = await resolveQuickBooksCustomerId(orgId, 'team-unmapped');

      expect(result).toBeNull();
    });
  });
});
