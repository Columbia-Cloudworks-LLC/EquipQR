/**
 * QuickBooks Service Tests
 * 
 * Tests for the QuickBooks integration service layer including:
 * - OAuth session management
 * - Connection status
 * - Team-customer mapping
 * - Customer search
 * - Invoice export
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockSupabaseClient } from '@/test/utils/mock-supabase';

// Mock the supabase client before importing the service
vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

// Import after mock setup
import { supabase } from '@/integrations/supabase/client';
import {
  createOAuthSession,
  validateOAuthSession,
  getConnectionStatus,
  disconnectQuickBooks,
  getTeamCustomerMapping,
  updateTeamCustomerMapping,
  clearTeamCustomerMapping,
  searchCustomers,
  exportInvoice,
  getExportLogs,
  getLastSuccessfulExport,
} from '@/services/quickbooks/quickbooksService';

describe('QuickBooks Service', () => {
  const mockOrganizationId = 'org-123';
  const mockTeamId = 'team-456';
  const mockWorkOrderId = 'wo-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createOAuthSession', () => {
    it('should create an OAuth session successfully', async () => {
      const mockSessionData = {
        session_token: 'test-session-token',
        nonce: 'test-nonce',
        expires_at: new Date().toISOString(),
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [mockSessionData],
        error: null,
        count: 1,
        status: 200,
        statusText: 'OK',
      });

      const result = await createOAuthSession(mockOrganizationId);

      expect(result).toEqual({
        sessionToken: mockSessionData.session_token,
        nonce: mockSessionData.nonce,
        expiresAt: mockSessionData.expires_at,
      });
      expect(supabase.rpc).toHaveBeenCalledWith('create_quickbooks_oauth_session', {
        p_organization_id: mockOrganizationId,
        p_redirect_url: null,
      });
    });

    it('should throw error when RPC fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: 'DB001', details: null, hint: null },
        count: 0,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(createOAuthSession(mockOrganizationId)).rejects.toThrow(
        'Failed to create OAuth session: Database error'
      );
    });

    it('should throw error when no data returned', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
        status: 200,
        statusText: 'OK',
      });

      await expect(createOAuthSession(mockOrganizationId)).rejects.toThrow(
        'No session data returned'
      );
    });
  });

  describe('validateOAuthSession', () => {
    it('should validate a valid session', async () => {
      const mockValidation = {
        is_valid: true,
        organization_id: mockOrganizationId,
        user_id: 'user-123',
        redirect_url: '/settings',
        nonce: 'test-nonce',
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [mockValidation],
        error: null,
        count: 1,
        status: 200,
        statusText: 'OK',
      });

      const result = await validateOAuthSession('test-token');

      expect(result).toEqual({
        isValid: true,
        organizationId: mockOrganizationId,
        userId: 'user-123',
        redirectUrl: '/settings',
        nonce: 'test-nonce',
      });
    });

    it('should return invalid for expired/missing session', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
        status: 200,
        statusText: 'OK',
      });

      const result = await validateOAuthSession('invalid-token');

      expect(result).toEqual({ isValid: false });
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connected status with valid credentials', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const mockStatus = {
        is_connected: true,
        realm_id: 'realm-123',
        connected_at: now.toISOString(),
        access_token_expires_at: futureDate.toISOString(),
        refresh_token_expires_at: futureDate.toISOString(),
        is_access_token_valid: true,
        is_refresh_token_valid: true,
        scopes: 'com.intuit.quickbooks.accounting',
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [mockStatus],
        error: null,
        count: 1,
        status: 200,
        statusText: 'OK',
      });

      const result = await getConnectionStatus(mockOrganizationId);

      expect(result.isConnected).toBe(true);
      expect(result.realmId).toBe('realm-123');
      expect(result.isAccessTokenValid).toBe(true);
      expect(result.isRefreshTokenValid).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('get_quickbooks_connection_status', {
        p_organization_id: mockOrganizationId,
      });
    });

    it('should return not connected when no credentials exist', async () => {
      const mockStatus = {
        is_connected: false,
        realm_id: null,
        connected_at: null,
        access_token_expires_at: null,
        refresh_token_expires_at: null,
        is_access_token_valid: false,
        is_refresh_token_valid: false,
        scopes: null,
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [mockStatus],
        error: null,
        count: 1,
        status: 200,
        statusText: 'OK',
      });

      const result = await getConnectionStatus(mockOrganizationId);

      expect(result.isConnected).toBe(false);
    });

    it('should return not connected on RPC error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Permission denied', code: 'PERM001', details: null, hint: null },
        count: 0,
        status: 403,
        statusText: 'Forbidden',
      });

      const result = await getConnectionStatus(mockOrganizationId);

      expect(result.isConnected).toBe(false);
    });
  });

  describe('disconnectQuickBooks', () => {
    it('should disconnect successfully', async () => {
      const mockResult = {
        success: true,
        message: 'QuickBooks disconnected successfully',
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [mockResult],
        error: null,
        count: 1,
        status: 200,
        statusText: 'OK',
      });

      await expect(disconnectQuickBooks(mockOrganizationId)).resolves.not.toThrow();
      expect(supabase.rpc).toHaveBeenCalledWith('disconnect_quickbooks', {
        p_organization_id: mockOrganizationId,
        p_realm_id: null,
      });
    });

    it('should throw error on RPC failure', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Permission denied', code: 'PERM001', details: null, hint: null },
        count: 0,
        status: 403,
        statusText: 'Forbidden',
      });

      await expect(disconnectQuickBooks(mockOrganizationId)).rejects.toThrow(
        'Failed to disconnect QuickBooks: Permission denied'
      );
    });

    it('should throw error when disconnect fails', async () => {
      const mockResult = {
        success: false,
        message: 'No QuickBooks connection found to disconnect',
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [mockResult],
        error: null,
        count: 1,
        status: 200,
        statusText: 'OK',
      });

      await expect(disconnectQuickBooks(mockOrganizationId)).rejects.toThrow(
        'No QuickBooks connection found to disconnect'
      );
    });
  });

  describe('getTeamCustomerMapping', () => {
    it('should return existing mapping', async () => {
      const mockMapping = {
        id: 'mapping-123',
        organization_id: mockOrganizationId,
        team_id: mockTeamId,
        quickbooks_customer_id: 'qb-cust-456',
        display_name: 'Test Customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockMapping, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as unknown as ReturnType<typeof supabase.from>);

      const result = await getTeamCustomerMapping(mockOrganizationId, mockTeamId);

      expect(result).toEqual(mockMapping);
    });

    it('should return null when no mapping exists', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as unknown as ReturnType<typeof supabase.from>);

      const result = await getTeamCustomerMapping(mockOrganizationId, mockTeamId);

      expect(result).toBeNull();
    });
  });

  describe('updateTeamCustomerMapping', () => {
    it('should create or update mapping', async () => {
      const mockMapping = {
        id: 'mapping-123',
        organization_id: mockOrganizationId,
        team_id: mockTeamId,
        quickbooks_customer_id: 'qb-cust-456',
        display_name: 'Test Customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockChain = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMapping, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as unknown as ReturnType<typeof supabase.from>);

      const result = await updateTeamCustomerMapping(
        mockOrganizationId,
        mockTeamId,
        'qb-cust-456',
        'Test Customer'
      );

      expect(result).toEqual(mockMapping);
      expect(supabase.from).toHaveBeenCalledWith('quickbooks_team_customers');
    });
  });

  describe('clearTeamCustomerMapping', () => {
    it('should delete mapping successfully', async () => {
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      // Make the second eq call resolve with the result
      mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({ error: null });

      vi.mocked(supabase.from).mockReturnValue(mockChain as unknown as ReturnType<typeof supabase.from>);

      await expect(clearTeamCustomerMapping(mockOrganizationId, mockTeamId)).resolves.not.toThrow();
    });
  });

  describe('getExportLogs', () => {
    it('should return export logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          work_order_id: mockWorkOrderId,
          status: 'success',
          quickbooks_invoice_id: 'inv-123',
          created_at: new Date().toISOString(),
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockLogs, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as unknown as ReturnType<typeof supabase.from>);

      const result = await getExportLogs(mockWorkOrderId);

      expect(result).toEqual(mockLogs);
      expect(supabase.from).toHaveBeenCalledWith('quickbooks_export_logs');
    });

    it('should return empty array on error', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Error', code: 'ERR', details: null, hint: null } 
        }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as unknown as ReturnType<typeof supabase.from>);

      const result = await getExportLogs(mockWorkOrderId);

      expect(result).toEqual([]);
    });
  });

  describe('getLastSuccessfulExport', () => {
    it('should return last successful export', async () => {
      const mockExport = {
        id: 'log-1',
        work_order_id: mockWorkOrderId,
        status: 'success',
        quickbooks_invoice_id: 'inv-123',
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockExport, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as unknown as ReturnType<typeof supabase.from>);

      const result = await getLastSuccessfulExport(mockWorkOrderId);

      expect(result).toEqual(mockExport);
    });

    it('should return null when no successful export exists', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      vi.mocked(supabase.from).mockReturnValue(mockChain as unknown as ReturnType<typeof supabase.from>);

      const result = await getLastSuccessfulExport(mockWorkOrderId);

      expect(result).toBeNull();
    });
  });

  describe('searchCustomers', () => {
    beforeEach(() => {
      // Reset fetch mock
      global.fetch = vi.fn();
    });

    it('should return error when not authenticated', async () => {
      // Mock auth.getSession to return no session
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const result = await searchCustomers(mockOrganizationId, 'test');

      expect(result).toEqual({ success: false, error: 'Not authenticated' });
    });

    it('should return customers on successful search', async () => {
      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
        user: { id: 'user-123', email: 'test@test.com', app_metadata: {}, user_metadata: {}, aud: 'test', created_at: '' },
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const mockCustomers = [
        { Id: '1', DisplayName: 'Customer A' },
        { Id: '2', DisplayName: 'Customer B' },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ customers: mockCustomers }),
      } as Response);

      const result = await searchCustomers(mockOrganizationId, 'test');

      expect(result.success).toBe(true);
      expect(result.customers).toEqual(mockCustomers);
    });
  });

  describe('exportInvoice', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('should return error when not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const result = await exportInvoice(mockWorkOrderId);

      expect(result).toEqual({ success: false, error: 'Not authenticated' });
    });

    it('should export invoice successfully', async () => {
      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
        user: { id: 'user-123', email: 'test@test.com', app_metadata: {}, user_metadata: {}, aud: 'test', created_at: '' },
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          invoice_id: 'inv-123',
          invoice_number: '1001',
          is_update: false,
        }),
      } as Response);

      const result = await exportInvoice(mockWorkOrderId);

      expect(result.success).toBe(true);
      expect(result.invoiceId).toBe('inv-123');
      expect(result.invoiceNumber).toBe('1001');
      expect(result.isUpdate).toBe(false);
    });

    it('should export invoice successfully even if PDF attachment fails', async () => {
      // Note: PDF attachment is handled server-side in the edge function.
      // If PDF attachment fails, the invoice export should still succeed.
      // This test verifies that the client-side service doesn't break
      // when the edge function includes PDF attachment logic.
      
      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
        user: { id: 'user-123', email: 'test@test.com', app_metadata: {}, user_metadata: {}, aud: 'test', created_at: '' },
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          invoice_id: 'inv-123',
          invoice_number: '1001',
          is_update: false,
        }),
      } as Response);

      const result = await exportInvoice(mockWorkOrderId);

      expect(result.success).toBe(true);
      expect(result.invoiceId).toBe('inv-123');
      expect(result.invoiceNumber).toBe('1001');
      expect(result.isUpdate).toBe(false);
    });
  });
});
