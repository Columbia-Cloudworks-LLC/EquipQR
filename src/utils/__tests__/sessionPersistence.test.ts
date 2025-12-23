import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveOrganizationPreference,
  getOrganizationPreference,
  clearOrganizationPreference,
  shouldRefreshSession,
  getSessionStorageKey,
  getSessionVersion,
} from '../sessionPersistence';
import { logger } from '@/utils/logger';

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('sessionPersistence', () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
        }),
      },
      writable: true,
    });
  });

  afterEach(() => {
    // Clear mock storage
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
  });

  describe('saveOrganizationPreference', () => {
    it('should save organization preference to localStorage', () => {
      saveOrganizationPreference('org-123');

      expect(localStorage.setItem).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Organization preference saved',
        { organizationId: 'org-123' }
      );
    });

    it('should save null organization preference', () => {
      saveOrganizationPreference(null);

      expect(localStorage.setItem).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Organization preference saved',
        { organizationId: null }
      );
    });

    it('should handle localStorage errors gracefully', () => {
      vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });

      saveOrganizationPreference('org-123');

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to save organization preference',
        expect.any(Error)
      );
    });
  });

  describe('getOrganizationPreference', () => {
    it('should return null when no preference stored', () => {
      const result = getOrganizationPreference();
      expect(result).toBeNull();
    });

    it('should return preference when valid and recent', () => {
      const recentTimestamp = new Date().toISOString();
      const stored = JSON.stringify({
        selectedOrgId: 'org-123',
        selectionTimestamp: recentTimestamp,
      });
      
      vi.mocked(localStorage.getItem).mockReturnValueOnce(stored);

      const result = getOrganizationPreference();
      expect(result?.selectedOrgId).toBe('org-123');
    });

    it('should return null and clear when preference is expired (> 24 hours)', () => {
      const oldTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      const stored = JSON.stringify({
        selectedOrgId: 'org-123',
        selectionTimestamp: oldTimestamp,
      });
      
      vi.mocked(localStorage.getItem).mockReturnValueOnce(stored);

      const result = getOrganizationPreference();
      
      expect(result).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Organization preference expired, clearing');
    });

    it('should handle invalid JSON gracefully', () => {
      vi.mocked(localStorage.getItem).mockReturnValueOnce('invalid json');

      const result = getOrganizationPreference();
      
      expect(result).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to get organization preference',
        expect.any(Error)
      );
    });
  });

  describe('clearOrganizationPreference', () => {
    it('should remove preference from localStorage', () => {
      clearOrganizationPreference();
      expect(localStorage.removeItem).toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      vi.mocked(localStorage.removeItem).mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      clearOrganizationPreference();

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to clear organization preference',
        expect.any(Error)
      );
    });
  });

  describe('shouldRefreshSession', () => {
    it('should return true when no lastRefresh provided', () => {
      expect(shouldRefreshSession(undefined)).toBe(true);
    });

    it('should return false for recent refresh (< 15 minutes)', () => {
      const recentRefresh = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(shouldRefreshSession(recentRefresh)).toBe(false);
    });

    it('should return true for old refresh (> 15 minutes)', () => {
      const oldRefresh = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      expect(shouldRefreshSession(oldRefresh)).toBe(true);
    });

    it('should return false for boundary case at 15 minutes', () => {
      // Mock Date.now() to ensure consistent timing for boundary test
      const fixedNow = 1700000000000; // Fixed timestamp
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => fixedNow);
      
      try {
        // At exactly 15 minutes, the lastRefreshTime equals fifteenMinutesAgo
        // so lastRefreshTime < fifteenMinutesAgo is false
        const boundaryRefresh = new Date(fixedNow - 15 * 60 * 1000).toISOString();
        expect(shouldRefreshSession(boundaryRefresh)).toBe(false);
      } finally {
        Date.now = originalDateNow;
      }
    });

    it('should return false for very recent refresh', () => {
      const veryRecentRefresh = new Date(Date.now() - 1000).toISOString(); // 1 second ago
      expect(shouldRefreshSession(veryRecentRefresh)).toBe(false);
    });
  });

  describe('constants', () => {
    it('should return session storage key', () => {
      expect(getSessionStorageKey()).toBe('equipqr_session_data');
    });

    it('should return session version', () => {
      expect(getSessionVersion()).toBe(2);
    });
  });
});
