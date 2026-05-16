import { supabase } from '@/integrations/supabase/client';
import type {
  CustomerRow,
  CustomerInsert,
  CustomerUpdate,
  ExternalContactRow,
  ExternalContactInsert,
  ExternalContactUpdate,
  ExternalContactListRow,
} from '@/features/teams/types/team';
import type { QBODerivedContact } from '@/services/quickbooks/types';

// ============================================
// Customer Account CRUD
// ============================================

export async function getCustomersByOrg(organizationId: string): Promise<CustomerRow[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function getCustomerById(customerId: string, organizationId?: string): Promise<CustomerRow | null> {
  let query = supabase
    .from('customers')
    .select('*')
    .eq('id', customerId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data;
}

export async function createCustomer(customer: CustomerInsert): Promise<CustomerRow> {
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomer(customerId: string, updates: CustomerUpdate, organizationId?: string): Promise<CustomerRow> {
  let query = supabase
    .from('customers')
    .update(updates)
    .eq('id', customerId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

export async function linkTeamToCustomer(teamId: string, customerId: string | null, organizationId?: string): Promise<void> {
  let query = supabase
    .from('teams')
    .update({ customer_id: customerId })
    .eq('id', teamId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { error } = await query;

  if (error) throw error;
}

// ============================================
// QuickBooks → Customer Import / Refresh
// ============================================

export interface QBCustomerPayload {
  Id: string;
  DisplayName: string;
  GivenName?: string;
  FamilyName?: string;
  CompanyName?: string;
  Taxable?: boolean;
  Email?: string;
  Phone?: string;
  Mobile?: string;
  Fax?: string;
  AlternatePhone?: string;
  contacts?: QBODerivedContact[];
  BillAddr?: {
    Line1?: string;
    City?: string;
    State?: string;
    Country?: string;
    PostalCode?: string;
  };
  ShipAddr?: {
    Line1?: string;
    City?: string;
    State?: string;
    Country?: string;
    PostalCode?: string;
  };
}

function qbAddrToJson(addr?: QBCustomerPayload['BillAddr']): Record<string, string> | null {
  if (!addr) return null;
  return {
    line1: addr.Line1 ?? '',
    city: addr.City ?? '',
    state: addr.State ?? '',
    country: addr.Country ?? '',
    postal_code: addr.PostalCode ?? '',
  };
}

/** Slim QBO debug snapshot per contact row (avoid storing the full customer payload N times). */
function buildQuickBooksContactSourcePayload(
  qb: QBCustomerPayload,
  contact: QBODerivedContact
): NonNullable<ExternalContactInsert['source_payload']> {
  return {
    Id: qb.Id,
    DisplayName: qb.DisplayName,
    sourceField: contact.sourceField,
    name: contact.name,
    role: contact.role,
    email: contact.email,
    phone: contact.phone,
  } as unknown as NonNullable<ExternalContactInsert['source_payload']>;
}

/**
 * Upsert QBO-sourced external contacts for a customer.
 * Inserts or updates one row per sourceField, then deletes stale QBO rows
 * whose sourceField is no longer present in the latest QBO payload.
 * Manual contacts (source = 'manual') are never touched.
 *
 * When qb.contacts is undefined the function returns immediately, preserving
 * any previously-synced QBO rows.  Pass contacts: [] to explicitly clear them.
 */
export async function replaceQuickBooksExternalContacts(
  organizationId: string,
  customerId: string,
  qb: QBCustomerPayload
): Promise<void> {
  // Preserve existing QBO contact rows when the caller did not supply contacts.
  if (qb.contacts === undefined) return;

  // Validate that the customer belongs to the stated organization before mutating.
  const owner = await getCustomerById(customerId, organizationId);
  if (!owner) {
    throw new Error(`Customer ${customerId} not found in organization ${organizationId}`);
  }

  const syncedAt = new Date().toISOString();
  const contacts = qb.contacts;

  if (contacts.length > 0) {
    const rows: ExternalContactInsert[] = contacts.map((c) => ({
      customer_id: customerId,
      name: c.name,
      email: c.email ?? null,
      phone: c.phone ?? null,
      role: c.role,
      notes: null,
      source: 'quickbooks',
      source_external_id: qb.Id,
      source_field: c.sourceField,
      last_synced_at: syncedAt,
      source_payload: buildQuickBooksContactSourcePayload(qb, c),
    }));

    const { error: upsertError } = await supabase
      .from('external_customer_contacts')
      .upsert(rows, {
        onConflict: 'customer_id,source_field',
        ignoreDuplicates: false,
      });

    if (upsertError) throw upsertError;
  }

  // Delete stale QBO-sourced rows whose sourceField is no longer present
  const activeFields = contacts.map((c) => c.sourceField);
  let deleteQuery = supabase
    .from('external_customer_contacts')
    .delete()
    .eq('customer_id', customerId)
    .eq('source', 'quickbooks');

  if (activeFields.length > 0) {
    deleteQuery = deleteQuery.not('source_field', 'in', `(${activeFields.map((f) => `"${f}"`).join(',')})`);
  }

  const { error: deleteError } = await deleteQuery;
  if (deleteError) throw deleteError;
}

/**
 * Import a QuickBooks customer as a new EquipQR customer account.
 * Returns the created customer row.
 */
export async function importCustomerFromQB(
  organizationId: string,
  qb: QBCustomerPayload
): Promise<CustomerRow> {
  const insert: CustomerInsert = {
    organization_id: organizationId,
    name: qb.DisplayName,
    status: 'active',
    email: qb.Email ?? null,
    phone: qb.Phone ?? null,
    billing_address: qbAddrToJson(qb.BillAddr),
    shipping_address: qbAddrToJson(qb.ShipAddr),
    quickbooks_customer_id: qb.Id,
    quickbooks_display_name: qb.DisplayName,
    quickbooks_synced_at: new Date().toISOString(),
    is_tax_exempt: qb.Taxable === undefined ? null : qb.Taxable === false,
  };

  const customer = await createCustomer(insert);
  try {
    await replaceQuickBooksExternalContacts(organizationId, customer.id, qb);
  } catch (syncErr) {
    const syncMessage =
      syncErr instanceof Error
        ? syncErr.message
        : syncErr && typeof syncErr === 'object' && 'message' in syncErr
          ? String((syncErr as { message: unknown }).message)
          : String(syncErr);
    const { error: rollbackError } = await supabase
      .from('customers')
      .delete()
      .eq('id', customer.id)
      .eq('organization_id', organizationId);

    if (rollbackError) {
      throw new Error(
        `${syncMessage} (Cleanup of the partially imported customer also failed: ${rollbackError.message})`,
        { cause: syncErr }
      );
    }
    throw syncErr instanceof Error ? syncErr : new Error(syncMessage, { cause: syncErr });
  }
  return customer;
}

/**
 * Refresh QB-sourced fields on an existing customer without overwriting
 * EquipQR-only fields (name, notes, account_owner_id, status).
 */
export async function refreshCustomerFromQB(
  organizationId: string,
  customerId: string,
  qb: QBCustomerPayload
): Promise<CustomerRow> {
  const updates: CustomerUpdate = {
    email: qb.Email ?? null,
    phone: qb.Phone ?? null,
    billing_address: qbAddrToJson(qb.BillAddr),
    shipping_address: qbAddrToJson(qb.ShipAddr),
    quickbooks_display_name: qb.DisplayName,
    quickbooks_synced_at: new Date().toISOString(),
    is_tax_exempt: qb.Taxable === undefined ? null : qb.Taxable === false,
  };

  const customer = await updateCustomer(customerId, updates, organizationId);
  await replaceQuickBooksExternalContacts(organizationId, customerId, qb);
  return customer;
}

// ============================================
// External Customer Contacts CRUD
// ============================================

/** List rows for UI — excludes `source_payload` (debug-only, can be large). */
export async function getExternalContacts(customerId: string): Promise<ExternalContactListRow[]> {
  const { data, error } = await supabase
    .from('external_customer_contacts')
    .select(
      'id, customer_id, name, email, phone, role, notes, source, source_external_id, source_field, last_synced_at, created_at, updated_at'
    )
    .eq('customer_id', customerId)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function createExternalContact(contact: ExternalContactInsert): Promise<ExternalContactRow> {
  const { data, error } = await supabase
    .from('external_customer_contacts')
    .insert(contact)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateExternalContact(
  contactId: string,
  updates: ExternalContactUpdate
): Promise<ExternalContactRow> {
  const { data, error } = await supabase
    .from('external_customer_contacts')
    .update(updates)
    .eq('id', contactId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExternalContact(contactId: string): Promise<void> {
  const { error } = await supabase
    .from('external_customer_contacts')
    .delete()
    .eq('id', contactId);

  if (error) throw error;
}

// ============================================
// QuickBooks Customer ID Resolution
// ============================================

/**
 * Resolve the QuickBooks customer ID for a team.
 * Primary path: team → customer account → quickbooks_customer_id.
 * Fallback: legacy quickbooks_team_customers mapping table.
 */
export async function resolveQuickBooksCustomerId(
  organizationId: string,
  teamId: string
): Promise<string | null> {
  const { data: team } = await supabase
    .from('teams')
    .select('customer_id')
    .eq('id', teamId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (team?.customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('quickbooks_customer_id')
      .eq('id', team.customer_id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (customer?.quickbooks_customer_id) {
      return customer.quickbooks_customer_id;
    }
  }

  // Fallback: legacy mapping table
  const { data: mapping } = await supabase
    .from('quickbooks_team_customers')
    .select('quickbooks_customer_id')
    .eq('organization_id', organizationId)
    .eq('team_id', teamId)
    .maybeSingle();

  return mapping?.quickbooks_customer_id ?? null;
}
