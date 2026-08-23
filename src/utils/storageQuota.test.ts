import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkStorageQuota, getStorageQuotaErrorMessage, MAX_STORAGE_GB } from './storageQuota';
import type { StorageQuotaCheck } from './storageQuota';
import { supabase } from '@/integrations/supabase/client';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn()
  }
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('storageQuota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkStorageQuota', () => {
    it('maps snake_case RPC payload to StorageQuotaCheck', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          can_upload: false,
          current_storage_gb: 4.8,
          max_storage_gb: 5,
          file_size_mb: 250,
          would_exceed: true,
          remaining_gb: 0.2,
          usage_percent: 96,
        },
        error: null,
      } as never);

      await expect(checkStorageQuota('org-1', 262144000)).resolves.toEqual({
        canUpload: false,
        currentStorageGB: 4.8,
        maxStorageGB: 5,
        fileSizeMB: 250,
        wouldExceed: true,
        remainingGB: 0.2,
        usagePercent: 96,
      });
    });
  });

  describe('MAX_STORAGE_GB', () => {
    it('should be 5 GB', () => {
      expect(MAX_STORAGE_GB).toBe(5);
    });
  });

  describe('getStorageQuotaErrorMessage', () => {
    it('returns formatted error message with quota details', () => {
      const quota: StorageQuotaCheck = {
        canUpload: false,
        currentStorageGB: 4.5,
        maxStorageGB: 5,
        fileSizeMB: 100,
        wouldExceed: true,
        remainingGB: 0.5,
        usagePercent: 90
      };

      const message = getStorageQuotaErrorMessage(quota);

      expect(message).toContain('Storage limit reached');
      expect(message).toContain('0.50 GB remaining');
      expect(message).toContain('5 GB');
    });

    it('handles zero remaining storage', () => {
      const quota: StorageQuotaCheck = {
        canUpload: false,
        currentStorageGB: 5,
        maxStorageGB: 5,
        fileSizeMB: 10,
        wouldExceed: true,
        remainingGB: 0,
        usagePercent: 100
      };

      const message = getStorageQuotaErrorMessage(quota);

      expect(message).toContain('0.00 GB remaining');
    });

    it('handles undefined remainingGB gracefully', () => {
      const quota = {
        canUpload: false,
        currentStorageGB: 5,
        maxStorageGB: 5,
        fileSizeMB: 10,
        wouldExceed: true,
        usagePercent: 100
      } as StorageQuotaCheck;

      const message = getStorageQuotaErrorMessage(quota);

      expect(message).toContain('0.00 GB remaining');
    });

    it('handles undefined maxStorageGB gracefully', () => {
      const quota = {
        canUpload: false,
        currentStorageGB: 4,
        fileSizeMB: 10,
        wouldExceed: true,
        remainingGB: 1,
        usagePercent: 80
      } as StorageQuotaCheck;

      const message = getStorageQuotaErrorMessage(quota);

      // Should use MAX_STORAGE_GB constant as fallback
      expect(message).toContain('5 GB');
    });
  });
});

