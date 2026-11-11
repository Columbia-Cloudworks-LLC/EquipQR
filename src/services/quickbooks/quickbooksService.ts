// fallow-ignore-file code-duplication
// Duplication rationale: QB service repeats contact sync row mapping blocks
/**
 * QuickBooks Integration Service
 * 
 * This module provides service methods for QuickBooks integration,
 * including OAuth session management, connection status, customer mapping,
 * and invoice export functionality.
 * 
 * @module services/quickbooks/quickbooksService
 */

import { supabase } from '@/integrations/supabase/client';
import type { QuickBooksConnectionStatus, QuickBooksInvoiceStatus } from './types';

/**
 * QuickBooks customer from the API
 */
export interface QuickBooksCustomer {
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
  contacts?: import('./types').QBODerivedContact[];
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
  // Backward-compat for legacy response shapes.
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  Active?: boolean;
}

/**
 * Team-customer mapping record
 */
export interface TeamCustomerMapping {
  id: string;
  organization_id: string;
  team_id: string;
  quickbooks_customer_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Export log record
 */
export interface QuickBooksExportLog {
  id: string;
  organization_id: string;
  work_order_id: string;
  realm_id: string;
  quickbooks_invoice_id: string | null;
  quickbooks_invoice_number: string | null;
  quickbooks_environment: 'sandbox' | 'production' | null;
  status: 'success' | 'error' | 'pending';
  error_message: string | null;
  exported_at: string | null;
  created_at: string;
  updated_at: string;
  intuit_tid: string | null;
  invoice_status?: QuickBooksInvoiceStatus | null;
  invoice_balance_cents?: number | null;
  invoice_last_synced_at?: string | null;
}

/**
 * Result of customer search
 */
export interface CustomerSearchResult {
  success: boolean;
  customers?: QuickBooksCustomer[];
  error?: string;
}


/**
 * Gets the QuickBooks connection status for an organization
 * 
 * Note: This uses a secure RPC function that only returns non-sensitive metadata.
 * OAuth tokens are never exposed to the client.
 * Only admin/owner can view connection status.
 * 
 * @param organizationId - The organization ID to check
 * @returns Connection status object
 */
export async function getConnectionStatus(
  organizationId: string
): Promise<QuickBooksConnectionStatus> {
  // Call secure RPC function that returns only non-sensitive metadata
  // The function enforces admin/owner authorization server-side
  const { data, error } = await supabase
    .rpc('get_quickbooks_connection_status', {
      p_organization_id: organizationId,
    });

  if (error) {
    // If error is permission-related, return not connected
    console.error('Error fetching QuickBooks connection status:', error);
    return { isConnected: false };
  }

  if (!data || data.length === 0) {
    return { isConnected: false };
  }

  const result = data[0];

  // If not connected, return early
  if (!result.is_connected) {
    return { isConnected: false };
  }

  return {
    isConnected: result.is_connected,
    realmId: result.realm_id,
    connectedAt: result.connected_at,
    accessTokenExpiresAt: result.access_token_expires_at,
    refreshTokenExpiresAt: result.refresh_token_expires_at,
    isAccessTokenValid: result.is_access_token_valid,
    isRefreshTokenValid: result.is_refresh_token_valid,
    scopes: result.scopes,
  };
}

/**
 * Disconnects QuickBooks from an organization by deleting credentials
 * 
 * Note: This uses a secure RPC function with proper authorization checks.
 * Only admin/owner can disconnect QuickBooks.
 * 
 * @param organizationId - The organization ID to disconnect
 * @param realmId - Optional specific realm to disconnect (if multiple)
 */
export async function disconnectQuickBooks(
  organizationId: string,
  realmId?: string
): Promise<void> {
  // Call secure RPC function that enforces admin/owner authorization
  const { data, error } = await supabase
    .rpc('disconnect_quickbooks', {
      p_organization_id: organizationId,
      p_realm_id: realmId || undefined,
    });

  if (error) {
    throw new Error(`Failed to disconnect QuickBooks: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Unexpected response format from disconnect operation');
  }

  const result = data[0];
  if (!result.success) {
    throw new Error(result.message || 'Failed to disconnect QuickBooks');
  }
}

/**
 * Gets the QuickBooks customer mapping for a team
 * 
 * @param organizationId - The organization ID
 * @param teamId - The team ID
 * @returns The customer mapping if exists, null otherwise
 */
export async function getTeamCustomerMapping(
  organizationId: string,
  teamId: string
): Promise<TeamCustomerMapping | null> {
  const { data, error } = await supabase
    .from('quickbooks_team_customers')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching team customer mapping:', error);
    return null;
  }

  return data as TeamCustomerMapping | null;
}

/**
 * Updates or creates the QuickBooks customer mapping for a team
 * 
 * @param organizationId - The organization ID
 * @param teamId - The team ID
 * @param quickbooksCustomerId - The QuickBooks customer ID
 * @param displayName - The customer display name
 */
export async function updateTeamCustomerMapping(
  organizationId: string,
  teamId: string,
  quickbooksCustomerId: string,
  displayName: string
): Promise<TeamCustomerMapping> {
  // Use upsert to handle both insert and update
  const { data, error } = await supabase
    .from('quickbooks_team_customers')
    .upsert(
      {
        organization_id: organizationId,
        team_id: teamId,
        quickbooks_customer_id: quickbooksCustomerId,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'organization_id,team_id',
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update team customer mapping: ${error.message}`);
  }

  return data as TeamCustomerMapping;
}

/**
 * Clears the QuickBooks customer mapping for a team
 * 
 * @param organizationId - The organization ID
 * @param teamId - The team ID
 */
export async function clearTeamCustomerMapping(
  organizationId: string,
  teamId: string
): Promise<void> {
  const { error } = await supabase
    .from('quickbooks_team_customers')
    .delete()
    .eq('organization_id', organizationId)
    .eq('team_id', teamId);

  if (error) {
    throw new Error(`Failed to clear team customer mapping: ${error.message}`);
  }
}

/**
 * Searches for QuickBooks customers
 * 
 * @param organizationId - The organization ID (to load credentials)
 * @param query - Optional search query
 * @returns List of matching customers
 */
export async function searchCustomers(
  organizationId: string,
  query?: string,
  options?: { quickbooksCustomerId?: string }
): Promise<CustomerSearchResult> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/quickbooks-search-customers`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        organization_id: organizationId,
        query: query || '',
        quickbooks_customer_id: options?.quickbooksCustomerId ?? undefined,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    return { 
      success: false, 
      error: result.error || 'Failed to search customers' 
    };
  }

  return {
    success: true,
    customers: result.customers || [],
  };
}

/**
 * Gets export logs for a work order
 * 
 * @param workOrderId - The work order ID
 * @returns List of export logs
 */
export async function getExportLogs(
  workOrderId: string
): Promise<QuickBooksExportLog[]> {
  const { data, error } = await supabase
    .from('quickbooks_export_logs')
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching export logs:', error);
    return [];
  }

  return (data || []) as QuickBooksExportLog[];
}

/**
 * Checks if a work order has been previously exported to QuickBooks
 * 
 * @param workOrderId - The work order ID
 * @returns The latest successful export log if exists
 */
export async function getLastSuccessfulExport(
  workOrderId: string
): Promise<QuickBooksExportLog | null> {
  const { data, error } = await supabase
    .from('quickbooks_export_logs')
    .select('*')
    .eq('work_order_id', workOrderId)
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching last successful export:', error);
    return null;
  }

  return data as QuickBooksExportLog | null;
}
