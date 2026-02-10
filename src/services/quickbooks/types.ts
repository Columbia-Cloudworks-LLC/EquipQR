/**
 * QuickBooks Integration Type Definitions
 * 
 * This module contains TypeScript type definitions for QuickBooks integration.
 * 
 * @module services/quickbooks/types
 */

/**
 * QuickBooks credentials stored in the database.
 *
 * **Server-side only** — this interface models access/refresh tokens that must
 * never be returned to the browser.  It is defined here for backward-compat
 * with existing barrel exports; the generated Supabase types in
 * `src/integrations/supabase/types.ts` are the canonical source of truth for
 * database row shapes.
 *
 * @deprecated Prefer the generated type from `src/integrations/supabase/types.ts`.
 */
export interface QuickBooksCredentials {
  id: string;
  organization_id: string;
  realm_id: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
  scopes: string;
  token_type: string;
  created_at: string;
  updated_at: string;
}

/**
 * QuickBooks connection status for display in UI
 */
export interface QuickBooksConnectionStatus {
  /** Whether QuickBooks is connected */
  isConnected: boolean;
  /** The connected QuickBooks company ID (realm_id) */
  realmId?: string;
  /** When the connection was established */
  connectedAt?: string;
  /** When the access token expires */
  accessTokenExpiresAt?: string;
  /** When the refresh token expires (user must re-authorize after this) */
  refreshTokenExpiresAt?: string;
  /** Whether the access token is currently valid */
  isAccessTokenValid?: boolean;
  /** Whether the refresh token is still valid */
  isRefreshTokenValid?: boolean;
  /** Scopes granted by the user */
  scopes?: string;
}

/**
 * Response from the QuickBooks OAuth token endpoint.
 *
 * **Server-side only** — used by Edge Functions during token exchange / refresh.
 * Included here for backward-compat with existing barrel exports.
 *
 * @deprecated This type is defined in each Edge Function that needs it.
 */
export interface QuickBooksTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  scope?: string;
}

/**
 * Error response from QuickBooks API
 */
export interface QuickBooksApiError {
  error: string;
  error_description?: string;
  intuit_tid?: string;
}

/**
 * Result of a token refresh operation
 */
export interface TokenRefreshResult {
  success: boolean;
  organizationId: string;
  realmId: string;
  error?: string;
  newExpiresAt?: string;
}

/**
 * Summary of token refresh batch operation
 */
export interface TokenRefreshSummary {
  success: boolean;
  message: string;
  refreshed: number;
  failed: number;
  results?: TokenRefreshResult[];
}

/**
 * Request payload for quickbooks-export-invoice Edge Function
 */
export type QuickBooksExportInvoiceRequest = {
  work_order_id: string;
};

/**
 * QuickBooks environment type
 */
export type QuickBooksEnvironment = 'sandbox' | 'production';

/**
 * Response from quickbooks-export-invoice Edge Function
 */
export type QuickBooksExportInvoiceResponse =
  | {
      success: true;
      invoice_id: string;
      invoice_number: string;
      is_update: boolean;
      environment: QuickBooksEnvironment;
      pdf_attached: boolean;
      message?: string;
    }
  | {
      success: false;
      error?: string;
    };

/**
 * UI-facing invoice export result (camelCase)
 */
export interface InvoiceExportResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  isUpdate?: boolean;
  environment?: QuickBooksEnvironment;
  pdfAttached?: boolean;
  error?: string;
}

/**
 * Constructs a QuickBooks Online URL to view an invoice
 */
export function getQuickBooksInvoiceUrl(invoiceId: string, environment: QuickBooksEnvironment): string {
  const baseUrl = environment === 'production' 
    ? 'https://app.qbo.intuit.com'
    : 'https://app.sandbox.qbo.intuit.com';
  return `${baseUrl}/app/invoice?txnId=${invoiceId}`;
}
