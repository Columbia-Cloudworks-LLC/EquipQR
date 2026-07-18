import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { CacheManager } from '../cacheManager';

// Type definitions for mocks

interface TestableCacheManager {
  instance?: CacheManager;
}

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let mockQueryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset singleton instance
    (CacheManager as unknown as TestableCacheManager).instance = undefined;
    
    // Create mock query client
    mockQueryClient = {
      invalidateQueries: vi.fn(),
      cancelQueries: vi.fn(),
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      getQueryCache: vi.fn(() => ({
        getAll: vi.fn(() => []),
      })),
      removeQueries: vi.fn(),
      clear: vi.fn(),
    } as unknown as QueryClient;

    cacheManager = CacheManager.getInstance();
    cacheManager.setQueryClient(mockQueryClient);
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CacheManager.getInstance();
      const instance2 = CacheManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('organization data invalidation', () => {
    const organizationId = 'org-1';

    it('should invalidate all organization-related queries', () => {
      cacheManager.invalidateOrganizationData(organizationId);

      const expectedPatterns = [
        ['teams-optimized', organizationId],
        ['work-orders-optimized', organizationId],
        ['equipment-optimized', organizationId],
        ['dashboard-optimized', organizationId],
        ['notes', organizationId],
        ['scans', organizationId],
        ['organization-members', organizationId],
        ['organization-admins', organizationId],
        ['organization-slots', organizationId],
        ['slot-availability', organizationId],
        ['slot-purchases', organizationId],
        ['organization-invitations', organizationId],
      ];

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(expectedPatterns.length);
      
      expectedPatterns.forEach(pattern => {
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: pattern });
      });
    });

    it('should handle missing query client gracefully', () => {
      const newCacheManager = CacheManager.getInstance();
      newCacheManager.setQueryClient(null as unknown as QueryClient);

      expect(() => {
        newCacheManager.invalidateOrganizationData(organizationId);
      }).not.toThrow();
    });
  });

  describe('equipment-related invalidation', () => {
    const organizationId = 'org-1';
    const equipmentId = 'eq-1';

    it('should invalidate equipment-related queries', () => {
      cacheManager.invalidateEquipmentRelated(organizationId, equipmentId);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['equipment-optimized', organizationId],
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['work-orders', 'equipment', organizationId, equipmentId],
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['notes', organizationId, equipmentId],
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['dashboard-optimized', organizationId],
      });
    });
  });

  describe('work order-related invalidation', () => {
    const organizationId = 'org-1';
    const workOrderId = 'wo-1';
    const equipmentId = 'eq-1';

    it('should invalidate work order queries', () => {
      cacheManager.invalidateWorkOrderRelated(organizationId, workOrderId);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['work-orders-optimized', organizationId],
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['dashboard-optimized', organizationId],
      });
    });

    it('should also invalidate equipment data when equipment ID provided', () => {
      cacheManager.invalidateWorkOrderRelated(organizationId, workOrderId, equipmentId);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['work-orders-optimized', organizationId],
      });

      // Should also call equipment invalidation
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['equipment-optimized', organizationId],
      });
    });
  });

  describe('team-related invalidation', () => {
    const organizationId = 'org-1';
    const teamId = 'team-1';

    it('should invalidate team and work order queries', () => {
      cacheManager.invalidateTeamRelated(organizationId, teamId);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['teams-optimized', organizationId],
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['work-orders-optimized', organizationId],
      });
    });
  });

  describe('batch invalidation', () => {
    const organizationId = 'org-1';

    it('should handle multiple operations efficiently', () => {
      const operations = [
        { type: 'equipment' as const, id: 'eq-1' },
        { type: 'workOrder' as const, id: 'wo-1', equipmentId: 'eq-1' },
        { type: 'team' as const, id: 'team-1' },
      ];

      cacheManager.batchInvalidate(organizationId, operations);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        predicate: expect.any(Function),
      });
    });

    it('should create unique invalidation patterns', () => {
      const operations = [
        { type: 'equipment' as const, id: 'eq-1' },
        { type: 'equipment' as const, id: 'eq-1' }, // Duplicate
        { type: 'workOrder' as const, id: 'wo-1' },
      ];

      cacheManager.batchInvalidate(organizationId, operations);

      // Should deduplicate operations
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    });
  });

  describe('optimistic updates', () => {
    const queryKey = ['test-query'];

    it('should perform optimistic update successfully', async () => {
      const oldData = { id: 1, name: 'old' };
      const newData = { id: 1, name: 'new' };
      const mutationFn = vi.fn().mockResolvedValue(undefined);
      const updater = vi.fn().mockReturnValue(newData);

      (mockQueryClient.getQueryData as ReturnType<typeof vi.fn>).mockReturnValue(oldData);

      await cacheManager.optimisticUpdate(queryKey, updater, mutationFn);

      expect(mockQueryClient.cancelQueries).toHaveBeenCalledWith({ queryKey });
      expect(mockQueryClient.getQueryData).toHaveBeenCalledWith(queryKey);
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(queryKey, updater);
      expect(mutationFn).toHaveBeenCalled();
    });

    it('should rollback on mutation failure', async () => {
      const oldData = { id: 1, name: 'old' };
      const newData = { id: 1, name: 'new' };
      const mutationError = new Error('Mutation failed');
      const mutationFn = vi.fn().mockRejectedValue(mutationError);
      const updater = vi.fn().mockReturnValue(newData);

      (mockQueryClient.getQueryData as ReturnType<typeof vi.fn>).mockReturnValue(oldData);

      await expect(
        cacheManager.optimisticUpdate(queryKey, updater, mutationFn)
      ).rejects.toThrow('Mutation failed');

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(queryKey, updater);
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(queryKey, oldData);
    });
  });

  describe('cache statistics', () => {
    it('should return cache statistics', () => {
      const mockQueries = [
        { getObserversCount: () => 1, isStale: () => false, state: { fetchStatus: 'idle', status: 'success' } },
        { getObserversCount: () => 0, isStale: () => true, state: { fetchStatus: 'fetching', status: 'loading' } },
        { getObserversCount: () => 2, isStale: () => false, state: { fetchStatus: 'idle', status: 'error' } },
      ];

      mockQueryClient.getQueryCache = vi.fn(() => ({
        getAll: () => mockQueries,
      })) as ReturnType<typeof vi.fn>;

      const stats = cacheManager.getCacheStats();

      expect(stats).toEqual({
        totalQueries: 3,
        activeQueries: 2,
        staleQueries: 1,
        fetchingQueries: 1,
        errorQueries: 1,
      });
    });

    it('should return null when no query client', () => {
      const newCacheManager = CacheManager.getInstance();
      newCacheManager.setQueryClient(null as unknown as QueryClient);

      const stats = newCacheManager.getCacheStats();
      expect(stats).toBe(null);
    });
  });

  describe('cache clearing', () => {
    it('should clear cache with pattern', () => {
      cacheManager.clearCache('equipment');

      expect(mockQueryClient.removeQueries).toHaveBeenCalledWith({
        predicate: expect.any(Function),
      });
    });

    it('should clear all cache when no pattern provided', () => {
      cacheManager.clearCache();

      expect(mockQueryClient.clear).toHaveBeenCalled();
    });

    it('should handle pattern matching correctly', () => {
      cacheManager.clearCache('equipment');

      const predicateFunction = (mockQueryClient.removeQueries as ReturnType<typeof vi.fn>).mock.calls[0][0].predicate;
      
      // Test the predicate function
      const equipmentQuery = { queryKey: ['equipment-optimized', 'org-1'] };
      const workOrderQuery = { queryKey: ['work-orders-optimized', 'org-1'] };

      expect(predicateFunction(equipmentQuery)).toBe(true);
      expect(predicateFunction(workOrderQuery)).toBe(false);
    });
  });
});