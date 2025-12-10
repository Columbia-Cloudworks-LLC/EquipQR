/**
 * QuickBooks Integration Type Definitions
 * 
 * This module contains TypeScript type definitions for QuickBooks integration.
 * 
 * @module services/quickbooks/types
 */

/**
 * QuickBooks credentials stored in the database
 * Matches the quickbooks_credentials table schema
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
 * Response from the QuickBooks OAuth token endpoint
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
