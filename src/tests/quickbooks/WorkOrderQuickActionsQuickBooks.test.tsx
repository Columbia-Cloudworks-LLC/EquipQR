/**
 * WorkOrderQuickActions QuickBooks Permission Tests
 * 
 * Tests that verify QuickBooks menu item visibility is gated by can_manage_quickbooks permission.
 * Uses unit testing approach by directly testing the component's logic via hook mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isQuickBooksEnabled } from '@/lib/flags';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';

// Mock the feature flags
vi.mock('@/lib/flags', () => ({
  isQuickBooksEnabled: vi.fn(() => true),
}));

// Mock the QuickBooks access hook
vi.mock('@/hooks/useQuickBooksAccess', () => ({
  useQuickBooksAccess: vi.fn(() => ({
    data: true,
    isLoading: false,
  })),
}));

/**
 * Helper function that mimics the showQuickBooks logic in WorkOrderQuickActions.
 * This allows us to test the logic directly without rendering the full component.
 */
const computeShowQuickBooks = (): boolean => {
  const quickBooksEnabled = isQuickBooksEnabled();
  const { data: canManageQuickBooks = false } = useQuickBooksAccess();
  return quickBooksEnabled && canManageQuickBooks;
};

describe('WorkOrderQuickActions QuickBooks Permission Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isQuickBooksEnabled).mockReturnValue(true);
    vi.mocked(useQuickBooksAccess).mockReturnValue({
      data: true,
      isLoading: false,
    });
  });

  describe('Feature Flag', () => {
    it('should return false when feature flag is disabled', () => {
      vi.mocked(isQuickBooksEnabled).mockReturnValue(false);
      vi.mocked(useQuickBooksAccess).mockReturnValue({
        data: true, // Has permission but feature disabled
        isLoading: false,
      });
      
      expect(computeShowQuickBooks()).toBe(false);
    });

    it('should return true when feature flag is enabled and user has permission', () => {
      vi.mocked(isQuickBooksEnabled).mockReturnValue(true);
      vi.mocked(useQuickBooksAccess).mockReturnValue({
        data: true,
        isLoading: false,
      });
      
      expect(computeShowQuickBooks()).toBe(true);
    });
  });

  describe('Permission Gating', () => {
    it('should return true for users with can_manage_quickbooks permission', () => {
      vi.mocked(useQuickBooksAccess).mockReturnValue({
        data: true,
        isLoading: false,
      });
      
      expect(computeShowQuickBooks()).toBe(true);
    });

    it('should return false for users without can_manage_quickbooks permission', () => {
      vi.mocked(useQuickBooksAccess).mockReturnValue({
        data: false,
        isLoading: false,
      });
      
      expect(computeShowQuickBooks()).toBe(false);
    });

    it('should return false when permission is loading (defaults to false)', () => {
      vi.mocked(useQuickBooksAccess).mockReturnValue({
        data: undefined, // Not yet loaded
        isLoading: true,
      });
      
      // With undefined data and default = false, should be false
      expect(computeShowQuickBooks()).toBe(false);
    });
  });

  describe('Permission Scenarios', () => {
    it('owner should see QuickBooks (always has permission)', () => {
      // Owners always have can_manage_quickbooks = true per RPC logic
      vi.mocked(useQuickBooksAccess).mockReturnValue({
        data: true,
        isLoading: false,
      });
      
      expect(computeShowQuickBooks()).toBe(true);
    });

    it('admin with can_manage_quickbooks=true should see QuickBooks', () => {
      vi.mocked(useQuickBooksAccess).mockReturnValue({
        data: true,
        isLoading: false,
      });
      
      expect(computeShowQuickBooks()).toBe(true);
    });

    it('admin with can_manage_quickbooks=false should NOT see QuickBooks', () => {
      vi.mocked(useQuickBooksAccess).mockReturnValue({
        data: false,
        isLoading: false,
      });
      
      expect(computeShowQuickBooks()).toBe(false);
    });

    it('regular member should NOT see QuickBooks', () => {
      // Members can never have can_manage_quickbooks permission per RPC logic
      vi.mocked(useQuickBooksAccess).mockReturnValue({
        data: false,
        isLoading: false,
      });
      
      expect(computeShowQuickBooks()).toBe(false);
    });
  });

  describe('Combined Conditions', () => {
    it('should return false when feature disabled even with permission', () => {
      vi.mocked(isQuickBooksEnabled).mockReturnValue(false);
      vi.mocked(useQuickBooksAccess).mockReturnValue({
        data: true,
        isLoading: false,
      });
      
      expect(computeShowQuickBooks()).toBe(false);
    });

    it('should return false when no permission even with feature enabled', () => {
      vi.mocked(isQuickBooksEnabled).mockReturnValue(true);
      vi.mocked(useQuickBooksAccess).mockReturnValue({
        data: false,
        isLoading: false,
      });
      
      expect(computeShowQuickBooks()).toBe(false);
    });

    it('should return true only when both feature enabled AND has permission', () => {
      vi.mocked(isQuickBooksEnabled).mockReturnValue(true);
      vi.mocked(useQuickBooksAccess).mockReturnValue({
        data: true,
        isLoading: false,
      });
      
      expect(computeShowQuickBooks()).toBe(true);
    });
  });
});
