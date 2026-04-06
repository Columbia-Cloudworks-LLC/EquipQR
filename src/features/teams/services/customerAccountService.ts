import { supabase } from '@/integrations/supabase/client';
import type {
  CustomerRow,
  CustomerInsert,
  CustomerUpdate,
  ExternalContactRow,
  ExternalContactInsert,
  ExternalContactUpdate,
} from '@/features/teams/types/team';

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
  CompanyName?: string;
  Email?: string;
  Phone?: string;
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
  };

  return createCustomer(insert);
}

/**
 * Refresh QB-sourced fields on an existing customer without overwriting
 * EquipQR-only fields (name, notes, account_owner_id, status).
 */
export async function refreshCustomerFromQB(
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
  };

  return updateCustomer(customerId, updates);
}

// ============================================
// External Customer Contacts CRUD
// ============================================

export async function getExternalContacts(customerId: string): Promise<ExternalContactRow[]> {
  const { data, error } = await supabase
    .from('external_customer_contacts')
    .select('*')
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
