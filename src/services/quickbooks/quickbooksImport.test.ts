import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@vitest-harness/utils/mock-supabase';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

import { supabase } from '@/integrations/supabase/client';
import {
  importCustomerFromQB,
  linkTeamToCustomer,
  refreshCustomerFromQB,
  resolveQuickBooksCustomerId,
} from '@/features/teams/services/customerAccountService';
import type { QBCustomerPayload } from '@/features/teams/services/customerAccountService';

const mockFrom = vi.mocked(supabase.from);

/**
 * Mimics Supabase query builders: chain returns this, await resolves `{ data, error }`.
 * `upsert()` configures the next await; `delete()` configures the next await (contact delete path).
 */
function createExternalContactsMutationChain(opts?: { upsertAwaitError?: { message: string } | null }) {
  const chain: {
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    not: ReturnType<typeof vi.fn>;
    then: ReturnType<typeof vi.fn>;
  } = {
    upsert: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    not: vi.fn(),
    then: vi.fn(),
  };

  chain.upsert.mockImplementation(() => {
    chain.then.mockImplementation((onFulfilled?: (v: unknown) => unknown) =>
      Promise.resolve({ data: null, error: opts?.upsertAwaitError ?? null }).then(onFulfilled)
    );
    return chain;
  });

  chain.delete.mockImplementation(() => {
    chain.then.mockImplementation((onFulfilled?: (v: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(onFulfilled)
    );
    return chain;
  });

  chain.eq.mockImplementation(() => chain);
  chain.not.mockImplementation(() => chain);

  return chain;
}

/**
 * Sets up mockFrom so that:
 * - 'external_customer_contacts' → externalContactsChain
 * - 'customers' → customerChain (handles both the mutation and the org-validation lookup)
 * The customerChain must include eq + maybeSingle for getCustomerById calls.
 */
const mockCustomerMutationWithContactReplacement = (
  customerChain: unknown,
  extOpts?: { upsertAwaitError?: { message: string } | null }
) => {
  const externalContactsChain = createExternalContactsMutationChain(extOpts);

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
      // Await uses the builder's thenable contract (like production Supabase).
      expect(externalContactsChain.then).toHaveBeenCalled();
    });

    it('stores slim per-contact source_payload on upsert (excludes full customer payload)', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'cust-slim', name: 'Acme Corp', organization_id: orgId },
          error: null,
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'cust-slim', name: 'Acme Corp', organization_id: orgId },
          error: null,
        }),
      };
      const externalContactsChain = mockCustomerMutationWithContactReplacement(mockChain);

      const payload: QBCustomerPayload = {
        Id: 'qb-42',
        DisplayName: 'Acme Corp',
        Email: 'billing@acme.com',
        contacts: [
          {
            sourceField: 'primary_email',
            name: 'Acme Corp',
            role: 'Primary email',
            email: 'billing@acme.com',
          },
        ],
        BillAddr: {
          Line1: '100 Main St',
          City: 'Dallas',
          State: 'TX',
          Country: 'US',
          PostalCode: '75201',
        },
      };

      await importCustomerFromQB(orgId, payload);

      expect(externalContactsChain.upsert.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          onConflict: 'customer_id,source,source_field',
          ignoreDuplicates: false,
        }),
      );

      const upsertRows = externalContactsChain.upsert.mock.calls[0][0] as Array<{
        source?: string;
        source_external_id?: string | null;
        source_field?: string | null;
        source_payload?: Record<string, unknown>;
      }>;
      expect(upsertRows[0]).toEqual(
        expect.objectContaining({
          source: 'quickbooks',
          source_external_id: 'qb-42',
          source_field: 'primary_email',
        }),
      );
      expect(upsertRows[0].source_payload).toEqual(
        expect.objectContaining({
          Id: 'qb-42',
          DisplayName: 'Acme Corp',
          sourceField: 'primary_email',
        })
      );
      expect(upsertRows[0].source_payload).not.toHaveProperty('BillAddr');
    });

    it('deletes the created customer when QBO contact sync fails', async () => {
      const mockChain: {
        insert: ReturnType<typeof vi.fn>;
        select: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        eq: ReturnType<typeof vi.fn>;
        single: ReturnType<typeof vi.fn>;
        maybeSingle: ReturnType<typeof vi.fn>;
        then: ReturnType<typeof vi.fn>;
      } = {
        insert: vi.fn(),
        select: vi.fn(),
        delete: vi.fn(),
        eq: vi.fn(),
        single: vi.fn(),
        maybeSingle: vi.fn(),
        then: vi.fn(),
      };
      mockChain.insert.mockReturnValue(mockChain);
      mockChain.select.mockReturnValue(mockChain);
      mockChain.delete.mockReturnValue(mockChain);
      mockChain.eq.mockReturnValue(mockChain);
      mockChain.single.mockResolvedValue({
        data: { id: 'cust-roll', name: 'Roll Corp', organization_id: orgId },
        error: null,
      });
      mockChain.maybeSingle.mockResolvedValue({
        data: { id: 'cust-roll', name: 'Roll Corp', organization_id: orgId },
        error: null,
      });
      mockChain.then.mockImplementation((onFulfilled?: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      );

      mockCustomerMutationWithContactReplacement(mockChain, { upsertAwaitError: { message: 'sync failed' } });

      const payload: QBCustomerPayload = {
        Id: 'qb-roll',
        DisplayName: 'Roll Corp',
        contacts: [
          { sourceField: 'primary_email', name: 'N', role: 'Primary email', email: 'n@x.com' },
        ],
      };

      await expect(importCustomerFromQB(orgId, payload)).rejects.toThrow('sync failed');

      expect(mockChain.delete).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'cust-roll');
      expect(mockChain.eq).toHaveBeenCalledWith('organization_id', orgId);
    });

    it('includes rollback failure context when customer cleanup fails', async () => {
      const mockChain: {
        insert: ReturnType<typeof vi.fn>;
        select: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        eq: ReturnType<typeof vi.fn>;
        single: ReturnType<typeof vi.fn>;
        maybeSingle: ReturnType<typeof vi.fn>;
        then: ReturnType<typeof vi.fn>;
      } = {
        insert: vi.fn(),
        select: vi.fn(),
        delete: vi.fn(),
        eq: vi.fn(),
        single: vi.fn(),
        maybeSingle: vi.fn(),
        then: vi.fn(),
      };
      mockChain.insert.mockReturnValue(mockChain);
      mockChain.select.mockReturnValue(mockChain);
      mockChain.delete.mockReturnValue(mockChain);
      mockChain.eq.mockReturnValue(mockChain);
      mockChain.single.mockResolvedValue({
        data: { id: 'cust-roll2', name: 'Roll2', organization_id: orgId },
        error: null,
      });
      mockChain.maybeSingle.mockResolvedValue({
        data: { id: 'cust-roll2', name: 'Roll2', organization_id: orgId },
        error: null,
      });
      mockChain.then.mockImplementation((onFulfilled?: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: { message: 'rollback failed' } }).then(onFulfilled)
      );

      mockCustomerMutationWithContactReplacement(mockChain, { upsertAwaitError: { message: 'sync failed' } });

      const payload: QBCustomerPayload = {
        Id: 'qb-roll2',
        DisplayName: 'Roll2',
        contacts: [
          { sourceField: 'primary_email', name: 'N', role: 'Primary email', email: 'n@x.com' },
        ],
      };

      await expect(importCustomerFromQB(orgId, payload)).rejects.toThrow(
        /sync failed.*Cleanup of the partially imported customer also failed: rollback failed/s
      );
    });

    it('should store null contact fields when payload omits contacts', async () => {
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

  describe('linkTeamToCustomer', () => {
    it('scopes the team link update by organization and verifies the updated row', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'team-1', customer_id: 'cust-1' },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockChain as never);

      await linkTeamToCustomer('team-1', 'cust-1', orgId);

      expect(mockFrom).toHaveBeenCalledWith('teams');
      expect(mockChain.update).toHaveBeenCalledWith({ customer_id: 'cust-1' });
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'team-1');
      expect(mockChain.eq).toHaveBeenCalledWith('organization_id', orgId);
      expect(mockChain.select).toHaveBeenCalledWith('id, customer_id');
    });

    it('throws when RLS or scoping updates zero team rows', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      mockFrom.mockReturnValue(mockChain as never);

      await expect(linkTeamToCustomer('team-1', 'cust-1', orgId)).rejects.toThrow(
        'Team customer account link could not be saved',
      );
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
