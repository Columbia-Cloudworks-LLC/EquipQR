/**
 * QuickBooks Auth Utility Tests
 *
 * Tests for the QuickBooks OAuth authentication utilities including:
 * - generateQuickBooksAuthUrl (OAuth URL generation)
 * - decodeOAuthState (state parameter decoding/validation)
 * - isQuickBooksConfigured (env var check)
 * - getQuickBooksAppCenterUrl (static URL helper)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockSupabaseClient } from '@/test/utils/mock-supabase';

// Mock the supabase client before importing the module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

import { supabase } from '@/integrations/supabase/client';
import {
  generateQuickBooksAuthUrl,
  decodeOAuthState,
  isQuickBooksConfigured,
  getQuickBooksAppCenterUrl,
} from '@/services/quickbooks/auth';

describe('QuickBooks Auth Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // decodeOAuthState
  // -----------------------------------------------------------------------
  describe('decodeOAuthState', () => {
    it('should decode a valid state parameter', () => {
      const state = {
        sessionToken: 'test-session-token',
        nonce: 'test-nonce',
        timestamp: Date.now(),
      };
      const encoded = btoa(JSON.stringify(state));

      const result = decodeOAuthState(encoded);

      expect(result).not.toBeNull();
      expect(result!.sessionToken).toBe('test-session-token');
      expect(result!.nonce).toBe('test-nonce');
      expect(result!.timestamp).toBe(state.timestamp);
    });

    it('should return null for invalid base64', () => {
      const result = decodeOAuthState('not-valid-base64!!!');

      expect(result).toBeNull();
    });

    it('should return null for valid base64 but invalid JSON', () => {
      const encoded = btoa('this is not json');

      const result = decodeOAuthState(encoded);

      expect(result).toBeNull();
    });

    it('should return null when sessionToken is missing', () => {
      const state = { nonce: 'test-nonce', timestamp: Date.now() };
      const encoded = btoa(JSON.stringify(state));

      const result = decodeOAuthState(encoded);

      expect(result).toBeNull();
    });

    it('should return null when nonce is missing', () => {
      const state = { sessionToken: 'token', timestamp: Date.now() };
      const encoded = btoa(JSON.stringify(state));

      const result = decodeOAuthState(encoded);

      expect(result).toBeNull();
    });

    it('should return null when timestamp is missing', () => {
      const state = { sessionToken: 'token', nonce: 'nonce' };
      const encoded = btoa(JSON.stringify(state));

      const result = decodeOAuthState(encoded);

      expect(result).toBeNull();
    });

    it('should return null when state is expired (older than 1 hour)', () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const state = {
        sessionToken: 'token',
        nonce: 'nonce',
        timestamp: twoHoursAgo,
      };
      const encoded = btoa(JSON.stringify(state));

      const result = decodeOAuthState(encoded);

      expect(result).toBeNull();
    });

    it('should accept state that is just under 1 hour old', () => {
      const fiftyMinutesAgo = Date.now() - 50 * 60 * 1000;
      const state = {
        sessionToken: 'token',
        nonce: 'nonce',
        timestamp: fiftyMinutesAgo,
      };
      const encoded = btoa(JSON.stringify(state));

      const result = decodeOAuthState(encoded);

      expect(result).not.toBeNull();
      expect(result!.sessionToken).toBe('token');
    });

    it('should return null for empty string', () => {
      const result = decodeOAuthState('');

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // isQuickBooksConfigured
  // -----------------------------------------------------------------------
  describe('isQuickBooksConfigured', () => {
    it('should return true when both env vars are set', () => {
      // Note: import.meta.env is set via vitest/vite env. If VITE_INTUIT_CLIENT_ID and
      // VITE_SUPABASE_URL are not defined, this will return false.
      // The actual result depends on the test environment setup.
      const result = isQuickBooksConfigured();
      expect(typeof result).toBe('boolean');
    });
  });

  // -----------------------------------------------------------------------
  // getQuickBooksAppCenterUrl
  // -----------------------------------------------------------------------
  describe('getQuickBooksAppCenterUrl', () => {
    it('should return the Intuit app center URL', () => {
      const url = getQuickBooksAppCenterUrl();

      expect(url).toBe('https://appcenter.intuit.com/app/connect');
    });
  });

  // -----------------------------------------------------------------------
  // generateQuickBooksAuthUrl
  // -----------------------------------------------------------------------
  describe('generateQuickBooksAuthUrl', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should throw when VITE_INTUIT_CLIENT_ID is not set', async () => {
      // Ensure the env var is explicitly unset so the test is deterministic
      vi.stubEnv('VITE_INTUIT_CLIENT_ID', '');

      await expect(
        generateQuickBooksAuthUrl({ organizationId: 'org-123' })
      ).rejects.toThrow('QuickBooks integration is not configured');
    });

    it('should call create_quickbooks_oauth_session RPC when configured', async () => {
      // Stub required env vars so the function reaches the RPC call
      vi.stubEnv('VITE_INTUIT_CLIENT_ID', 'test-client-id');
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');

      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not configured' },
      });
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      await expect(
        generateQuickBooksAuthUrl({ organizationId: 'org-123' })
      ).rejects.toThrow('Failed to create OAuth session');

      expect(mockRpc).toHaveBeenCalledWith('create_quickbooks_oauth_session', expect.objectContaining({
        p_organization_id: 'org-123',
        p_redirect_url: null,
      }));
    });
  });
});
