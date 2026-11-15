/**
 * QuickBooks Integration Type Definitions
 * 
 * This module contains TypeScript type definitions for QuickBooks integration.
 * 
 * @module services/quickbooks/types
 */

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
 * Normalized contact entry derived from a documented QBO Customer field.
 * Up to five entries per customer: primary_email, primary_phone, mobile, fax, alternate_phone.
 */
export interface QBODerivedContact {
  sourceField: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

/**
 * QuickBooks customer payload returned by customer search/sync APIs.
 */
export interface QuickBooksCustomerRecord {
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

/**
 * Request payload for quickbooks-export-invoice Edge Function
 */
export type QuickBooksExportInvoiceRequest = {
  action?: 'export';
  confirmation?: import('./invoiceReview').InvoiceConfirmation;
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
