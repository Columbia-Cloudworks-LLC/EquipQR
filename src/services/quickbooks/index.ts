/**
 * QuickBooks Integration Services
 * 
 * This module exports all QuickBooks-related services and utilities.
 * 
 * @module services/quickbooks
 */

export {
  generateQuickBooksAuthUrl,
  decodeOAuthState,
  isQuickBooksConfigured,
  getQuickBooksAppCenterUrl,
  type QuickBooksAuthConfig,
  type OAuthState,
} from './auth';

export {
  type QuickBooksCredentials,
  type QuickBooksConnectionStatus,
} from './types';
