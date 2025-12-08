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
import type { QuickBooksConnectionStatus, QuickBooksCredentials } from './types';

/**
 * QuickBooks customer from the API
 */
export interface QuickBooksCustomer {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
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
  status: 'success' | 'error' | 'pending';
  error_message: string | null;
  exported_at: string | null;
  created_at: string;
  updated_at: string;
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
 * Result of invoice export
 */
export interface InvoiceExportResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  isUpdate?: boolean;
  error?: string;
}

/**
 * Creates a new OAuth session for QuickBooks authorization
 * 
 * @param organizationId - The organization ID to connect QuickBooks to
 * @param redirectUrl - Optional custom redirect URL after OAuth completion
 * @returns Session data including token and nonce
 */
export async function createOAuthSession(
  organizationId: string,
  redirectUrl?: string | null
): Promise<{ sessionToken: string; nonce: string; expiresAt: string }> {
  const { data, error } = await supabase
    .rpc('create_quickbooks_oauth_session', {
      p_organization_id: organizationId,
      p_redirect_url: redirectUrl || null,
    });

  if (error) {
    throw new Error(`Failed to create OAuth session: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('No session data returned');
  }

  const session = data[0];
  return {
    sessionToken: session.session_token,
    nonce: session.nonce,
    expiresAt: session.expires_at,
  };
}

/**
 * Validates an OAuth session token
 * 
 * @param sessionToken - The session token to validate
 * @returns Session validation result
 */
export async function validateOAuthSession(
  sessionToken: string
): Promise<{
  isValid: boolean;
  organizationId?: string;
  userId?: string;
  redirectUrl?: string | null;
  nonce?: string;
}> {
  const { data, error } = await supabase
    .rpc('validate_quickbooks_oauth_session', {
      p_session_token: sessionToken,
    });

  if (error) {
    throw new Error(`Failed to validate OAuth session: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return { isValid: false };
  }

  const result = data[0];
  return {
    isValid: result.is_valid,
    organizationId: result.organization_id,
    userId: result.user_id,
    redirectUrl: result.redirect_url,
    nonce: result.nonce,
  };
}

/**
 * Gets the QuickBooks connection status for an organization
 * 
 * Note: This uses a direct query that will be filtered by RLS policies.
 * Only admin/owner can view credentials.
 * 
 * @param organizationId - The organization ID to check
 * @returns Connection status object
 */
export async function getConnectionStatus(
  organizationId: string
): Promise<QuickBooksConnectionStatus> {
  // Query quickbooks_credentials for this organization
  // RLS policies will only allow admin/owner to see this data
  const { data, error } = await supabase
    .from('quickbooks_credentials')
    .select('realm_id, access_token_expires_at, refresh_token_expires_at, scopes, created_at')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    // If error is permission-related, return not connected
    console.error('Error fetching QuickBooks credentials:', error);
    return { isConnected: false };
  }

  if (!data) {
    return { isConnected: false };
  }

  const now = new Date();
  const accessTokenExpiresAt = new Date(data.access_token_expires_at);
  const refreshTokenExpiresAt = new Date(data.refresh_token_expires_at);

  return {
    isConnected: true,
    realmId: data.realm_id,
    connectedAt: data.created_at,
    accessTokenExpiresAt: data.access_token_expires_at,
    refreshTokenExpiresAt: data.refresh_token_expires_at,
    isAccessTokenValid: accessTokenExpiresAt > now,
    isRefreshTokenValid: refreshTokenExpiresAt > now,
    scopes: data.scopes,
  };
}

/**
 * Manually triggers token refresh for credentials that are about to expire
 * 
 * @returns Result of the refresh operation
 */
export async function manualTokenRefresh(): Promise<{
  credentialsCount: number;
  message: string;
}> {
  const { data, error } = await supabase
    .rpc('refresh_quickbooks_tokens_manual');

  if (error) {
    throw new Error(`Failed to trigger token refresh: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return {
      credentialsCount: 0,
      message: 'No credentials to refresh',
    };
  }

  return {
    credentialsCount: data[0].credentials_count,
    message: data[0].message,
  };
}

/**
 * Disconnects QuickBooks from an organization by deleting credentials
 * 
 * Note: This operation requires admin/owner permissions via RLS
 * 
 * @param organizationId - The organization ID to disconnect
 * @param realmId - Optional specific realm to disconnect (if multiple)
 */
export async function disconnectQuickBooks(
  organizationId: string,
  realmId?: string
): Promise<void> {
  let query = supabase
    .from('quickbooks_credentials')
    .delete()
    .eq('organization_id', organizationId);

  if (realmId) {
    query = query.eq('realm_id', realmId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to disconnect QuickBooks: ${error.message}`);
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
  query?: string
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
 * Exports a work order to QuickBooks as a draft invoice
 * 
 * @param workOrderId - The work order ID to export
 * @returns Export result with invoice details
 */
export async function exportInvoice(
  workOrderId: string
): Promise<InvoiceExportResult> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/quickbooks-export-invoice`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        work_order_id: workOrderId,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    return { 
      success: false, 
      error: result.error || 'Failed to export invoice' 
    };
  }

  return {
    success: true,
    invoiceId: result.invoice_id,
    invoiceNumber: result.invoice_number,
    isUpdate: result.is_update,
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
