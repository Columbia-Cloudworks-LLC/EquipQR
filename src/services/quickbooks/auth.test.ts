/**
 * QuickBooks Auth Utility Tests
 *
 * Tests for the QuickBooks OAuth authentication utilities including:
 * - generateQuickBooksAuthUrl (OAuth URL generation)
 * - isQuickBooksConfigured (env var check)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockSupabaseClient } from '@vitest-harness/utils/mock-supabase';

// Mock the supabase client before importing the module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

import { supabase } from '@/integrations/supabase/client';
import {
  generateQuickBooksAuthUrl,
  isQuickBooksConfigured,
} from '@/services/quickbooks/auth';

describe('QuickBooks Auth Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // isQuickBooksConfigured
  // -----------------------------------------------------------------------
  describe('isQuickBooksConfigured', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('returns true when both env vars are set', () => {
      vi.stubEnv('VITE_INTUIT_CLIENT_ID', 'client-id');
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      expect(isQuickBooksConfigured()).toBe(true);
    });

    it('returns false when the Intuit client id is missing', () => {
      vi.stubEnv('VITE_INTUIT_CLIENT_ID', '');
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      expect(isQuickBooksConfigured()).toBe(false);
    });

    it('returns false when the Supabase URL is missing', () => {
      vi.stubEnv('VITE_INTUIT_CLIENT_ID', 'client-id');
      vi.stubEnv('VITE_SUPABASE_URL', '');
      expect(isQuickBooksConfigured()).toBe(false);
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
        p_redirect_url: undefined,
      }));
    });

    it('derives redirect_uri from VITE_SUPABASE_URL when override is unset', async () => {
      vi.stubEnv('VITE_INTUIT_CLIENT_ID', 'test-client-id');
      vi.stubEnv('VITE_SUPABASE_URL', 'https://olsdirkvvfegvclbpgrg.supabase.co');
      vi.stubEnv('VITE_QB_OAUTH_REDIRECT_BASE_URL', '');

      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ session_token: 'session-token', nonce: 'nonce-token' }],
        error: null,
      });
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      const url = await generateQuickBooksAuthUrl({ organizationId: 'org-123' });
      const parsed = new URL(url);

      expect(parsed.searchParams.get('redirect_uri')).toBe(
        'https://supabase.equipqr.app/functions/v1/quickbooks-oauth-callback',
      );
    });

    it('normalizes the retired preview Supabase redirect host', async () => {
      vi.stubEnv('VITE_INTUIT_CLIENT_ID', 'test-client-id');
      vi.stubEnv('VITE_SUPABASE_URL', 'https://olsdirkvvfegvclbpgrg.supabase.co');
      vi.stubEnv('VITE_QB_OAUTH_REDIRECT_BASE_URL', 'https://supabase.preview.equipqr.app');

      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ session_token: 'session-token', nonce: 'nonce-token' }],
        error: null,
      });
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      const url = await generateQuickBooksAuthUrl({ organizationId: 'org-123' });
      const parsed = new URL(url);

      expect(parsed.searchParams.get('redirect_uri')).toBe(
        'https://supabase.equipqr.app/functions/v1/quickbooks-oauth-callback',
      );
    });
  });
});
