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

export {
  createOAuthSession,
  validateOAuthSession,
  getConnectionStatus,
  manualTokenRefresh,
  disconnectQuickBooks,
  getTeamCustomerMapping,
  updateTeamCustomerMapping,
  clearTeamCustomerMapping,
  searchCustomers,
  exportInvoice,
  getExportLogs,
  getLastSuccessfulExport,
  type QuickBooksCustomer,
  type TeamCustomerMapping,
  type QuickBooksExportLog,
  type CustomerSearchResult,
  type InvoiceExportResult,
} from './quickbooksService';
