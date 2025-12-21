import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStorageQuotaErrorMessage, MAX_STORAGE_GB } from '../storageQuota';
import type { StorageQuotaCheck } from '../storageQuota';

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

