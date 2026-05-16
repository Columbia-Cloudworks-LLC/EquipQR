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

const createExternalContactsMutationChain = () => ({
  upsert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  error: null,
});

/**
 * Sets up mockFrom so that:
 * - 'external_customer_contacts' → externalContactsChain
 * - 'customers' → customerChain (handles both the mutation and the org-validation lookup)
 * The customerChain must include eq + maybeSingle for getCustomerById calls.
 */
const mockCustomerMutationWithContactReplacement = (customerChain: unknown) => {
  const externalContactsChain = createExternalContactsMutationChain();

  mockFrom.mockImplementation((table: string) => {
    if (table === 'external_customer_contacts') {
      return externalContactsChain as never;
    }
    return customerChain as never;
  });

  return externalContactsChain;
};

describe('QuickBooks Import', () => {
  const orgId = 'org-123';

  // contacts: [] means QBO returned an explicit empty contacts array → delete all QBO contacts.
  const sampleQBPayload: QBCustomerPayload = {
    Id: 'qb-42',
    DisplayName: 'Acme Corp',
    CompanyName: 'Acme Corporation',
    Taxable: false,
    Email: 'billing@acme.com',
    Phone: '555-123-4567',
    contacts: [],
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
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'cust-1', name: 'Acme Corp', organization_id: orgId },
          error: null,
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'cust-1', name: 'Acme Corp', organization_id: orgId },
          error: null,
        }),
      };
      const externalContactsChain = mockCustomerMutationWithContactReplacement(mockChain);

      await importCustomerFromQB(orgId, sampleQBPayload);

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: orgId,
          name: 'Acme Corp',
          email: 'billing@acme.com',
          phone: '555-123-4567',
          quickbooks_customer_id: 'qb-42',
          quickbooks_display_name: 'Acme Corp',
          is_tax_exempt: true,
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
      expect(externalContactsChain.delete).toHaveBeenCalled();
      expect(externalContactsChain.eq).toHaveBeenCalledWith('customer_id', 'cust-1');
      expect(externalContactsChain.eq).toHaveBeenCalledWith('source', 'quickbooks');
    });

    it('should handle null optional fields gracefully', async () => {
      // contacts is intentionally omitted → replaceQuickBooksExternalContacts returns early
      const minPayload: QBCustomerPayload = {
        Id: 'qb-99',
        DisplayName: 'Minimal Customer',
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'cust-2', name: 'Minimal Customer', organization_id: orgId },
          error: null,
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'cust-2', name: 'Minimal Customer', organization_id: orgId },
          error: null,
        }),
      };
      const externalContactsChain = mockCustomerMutationWithContactReplacement(mockChain);

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
      // contacts was omitted → early return, no contact rows touched
      expect(externalContactsChain.upsert).not.toHaveBeenCalled();
      expect(externalContactsChain.delete).not.toHaveBeenCalled();
    });

    it('should skip contact operations when contacts is undefined', async () => {
      const payloadWithoutContacts: QBCustomerPayload = {
        Id: 'qb-77',
        DisplayName: 'Skip Contacts Corp',
        contacts: undefined,
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'cust-3', name: 'Skip Contacts Corp', organization_id: orgId },
          error: null,
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'cust-3', name: 'Skip Contacts Corp', organization_id: orgId },
          error: null,
        }),
      };
      const externalContactsChain = mockCustomerMutationWithContactReplacement(mockChain);

      await importCustomerFromQB(orgId, payloadWithoutContacts);

      expect(externalContactsChain.upsert).not.toHaveBeenCalled();
      expect(externalContactsChain.delete).not.toHaveBeenCalled();
    });

    it('should delete all QBO contacts when contacts is explicitly empty', async () => {
      const payloadWithEmptyContacts: QBCustomerPayload = {
        Id: 'qb-88',
        DisplayName: 'Empty Contacts Corp',
        contacts: [],
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'cust-4', name: 'Empty Contacts Corp', organization_id: orgId },
          error: null,
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'cust-4', name: 'Empty Contacts Corp', organization_id: orgId },
          error: null,
        }),
      };
      const externalContactsChain = mockCustomerMutationWithContactReplacement(mockChain);

      await importCustomerFromQB(orgId, payloadWithEmptyContacts);

      // No upsert (no contacts to write)
      expect(externalContactsChain.upsert).not.toHaveBeenCalled();
      // Delete-all-QBO-contacts path fires
      expect(externalContactsChain.delete).toHaveBeenCalled();
      expect(externalContactsChain.eq).toHaveBeenCalledWith('customer_id', 'cust-4');
      expect(externalContactsChain.eq).toHaveBeenCalledWith('source', 'quickbooks');
    });
  });

  describe('refreshCustomerFromQB', () => {
    it('should update only QB-sourced fields and scope the update by organization', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'cust-1', name: 'Acme Corp', organization_id: orgId },
          error: null,
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'cust-1', name: 'Acme Corp', organization_id: orgId },
          error: null,
        }),
      };
      const externalContactsChain = mockCustomerMutationWithContactReplacement(mockChain);

      await refreshCustomerFromQB(orgId, 'cust-1', sampleQBPayload);

      const updateArg = mockChain.update.mock.calls[0][0];
      expect(updateArg.email).toBe('billing@acme.com');
      expect(updateArg.phone).toBe('555-123-4567');
      expect(updateArg.quickbooks_display_name).toBe('Acme Corp');
      expect(updateArg.is_tax_exempt).toBe(true);
      expect(updateArg.quickbooks_synced_at).toBeDefined();
      // Should NOT include name, notes, account_owner_id, or status
      expect(updateArg).not.toHaveProperty('name');
      expect(updateArg).not.toHaveProperty('notes');
      expect(updateArg).not.toHaveProperty('account_owner_id');
      expect(updateArg).not.toHaveProperty('status');
      // Update should be scoped to the organization
      expect(mockChain.eq).toHaveBeenCalledWith('organization_id', orgId);
      expect(externalContactsChain.delete).toHaveBeenCalled();
      expect(externalContactsChain.eq).toHaveBeenCalledWith('customer_id', 'cust-1');
      expect(externalContactsChain.eq).toHaveBeenCalledWith('source', 'quickbooks');
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
