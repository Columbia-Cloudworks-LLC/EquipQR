/**
 * useEquipment Hook Tests
 * 
 * Tests the equipment data fetching hooks with different
 * query scenarios and filter combinations.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useEquipment,
  useEquipmentById,
  useEquipmentNotes,
  useEquipmentScans,
  useEquipmentStatusCounts,
  useEquipmentManufacturersAndModels
} from '../useEquipment';
import { equipment, organizations, teams } from '@/test/fixtures/entities';

// Mock the EquipmentService
vi.mock('@/features/equipment/services/EquipmentService', () => ({
  EquipmentService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getNotesByEquipmentId: vi.fn(),
    getScansByEquipmentId: vi.fn(),
    getWorkOrdersByEquipmentId: vi.fn(),
    getStatusCounts: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createScan: vi.fn(),
    createNote: vi.fn()
  }
}));

// Mock useBackgroundSync
vi.mock('@/hooks/useCacheInvalidation', () => ({
  useBackgroundSync: () => ({
    subscribeToOrganization: vi.fn()
  })
}));

// Mock performanceMonitor
vi.mock('@/utils/performanceMonitoring', () => ({
  performanceMonitor: {
    recordMetric: vi.fn()
  }
}));

// Mock useAppToast
vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: () => ({
    toast: vi.fn()
  })
}));

import { EquipmentService } from '@/features/equipment/services/EquipmentService';

// Create a new query client for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0
      }
    }
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useEquipment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEquipment (main hook)', () => {
    beforeEach(() => {
      vi.mocked(EquipmentService.getAll).mockResolvedValue({
        success: true,
        data: Object.values(equipment)
      });
    });

    it('fetches equipment for organization', async () => {
      const { result } = renderHook(
        () => useEquipment(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(Object.keys(equipment).length);
      expect(EquipmentService.getAll).toHaveBeenCalledWith(
        organizations.acme.id,
        {},
        {}
      );
    });

    it('returns empty array when no organization provided', async () => {
      const { result } = renderHook(
        () => useEquipment(undefined),
        { wrapper: createWrapper() }
      );

      // Query should be disabled without organizationId
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('applies filters to query', async () => {
      const filters = { status: 'active' as const, teamId: teams.maintenance.id };
      
      const { result } = renderHook(
        () => useEquipment(organizations.acme.id, filters),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EquipmentService.getAll).toHaveBeenCalledWith(
        organizations.acme.id,
        filters,
        {}
      );
    });

    it('applies pagination to query', async () => {
      const pagination = { limit: 10, offset: 0 };
      
      const { result } = renderHook(
        () => useEquipment(organizations.acme.id, {}, pagination),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EquipmentService.getAll).toHaveBeenCalledWith(
        organizations.acme.id,
        {},
        pagination
      );
    });

    it('handles API errors', async () => {
      vi.mocked(EquipmentService.getAll).mockResolvedValueOnce({
        success: false,
        error: 'Failed to fetch equipment'
      });

      const { result } = renderHook(
        () => useEquipment(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Failed to fetch equipment');
    });

    it('uses custom stale time', async () => {
      const customStaleTime = 120000;
      
      const { result } = renderHook(
        () => useEquipment(organizations.acme.id, {}, {}, { staleTime: customStaleTime }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EquipmentService.getAll).toHaveBeenCalled();
    });
  });

  describe('useEquipmentById', () => {
    beforeEach(() => {
      vi.mocked(EquipmentService.getById).mockResolvedValue({
        success: true,
        data: equipment.forklift1
      });
    });

    it('fetches single equipment by id', async () => {
      const { result } = renderHook(
        () => useEquipmentById(organizations.acme.id, equipment.forklift1.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EquipmentService.getById).toHaveBeenCalledWith(
        organizations.acme.id,
        equipment.forklift1.id
      );
      expect(result.current.data?.id).toBe(equipment.forklift1.id);
    });

    it('is disabled without equipmentId', () => {
      const { result } = renderHook(
        () => useEquipmentById(organizations.acme.id, undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe('idle');
    });

    it('is disabled without organizationId', () => {
      const { result } = renderHook(
        () => useEquipmentById(undefined, equipment.forklift1.id),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe('idle');
    });

    it('handles not found error', async () => {
      vi.mocked(EquipmentService.getById).mockResolvedValueOnce({
        success: false,
        error: 'Equipment not found'
      });

      const { result } = renderHook(
        () => useEquipmentById(organizations.acme.id, 'non-existent-id'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Equipment not found');
    });
  });

  describe('useEquipmentNotes', () => {
    const mockNotes = [
      { id: 'note-1', content: 'Test note 1', equipment_id: equipment.forklift1.id },
      { id: 'note-2', content: 'Test note 2', equipment_id: equipment.forklift1.id }
    ];

    beforeEach(() => {
      vi.mocked(EquipmentService.getNotesByEquipmentId).mockResolvedValue({
        success: true,
        data: mockNotes
      });
    });

    it('fetches notes for equipment', async () => {
      const { result } = renderHook(
        () => useEquipmentNotes(organizations.acme.id, equipment.forklift1.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EquipmentService.getNotesByEquipmentId).toHaveBeenCalledWith(
        organizations.acme.id,
        equipment.forklift1.id
      );
      expect(result.current.data).toHaveLength(2);
    });

    it('is disabled without equipmentId', () => {
      const { result } = renderHook(
        () => useEquipmentNotes(organizations.acme.id, undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useEquipmentScans', () => {
    const mockScans = [
      { id: 'scan-1', equipment_id: equipment.forklift1.id, scanned_at: new Date().toISOString() }
    ];

    beforeEach(() => {
      vi.mocked(EquipmentService.getScansByEquipmentId).mockResolvedValue({
        success: true,
        data: mockScans
      });
    });

    it('fetches scans for equipment', async () => {
      const { result } = renderHook(
        () => useEquipmentScans(organizations.acme.id, equipment.forklift1.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EquipmentService.getScansByEquipmentId).toHaveBeenCalledWith(
        organizations.acme.id,
        equipment.forklift1.id
      );
      expect(result.current.data).toHaveLength(1);
    });

    it('is disabled without equipmentId', () => {
      const { result } = renderHook(
        () => useEquipmentScans(organizations.acme.id, undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useEquipmentStatusCounts', () => {
    const mockCounts = { active: 5, maintenance: 2, inactive: 1 };

    beforeEach(() => {
      vi.mocked(EquipmentService.getStatusCounts).mockResolvedValue({
        success: true,
        data: mockCounts
      });
    });

    it('fetches status counts', async () => {
      const { result } = renderHook(
        () => useEquipmentStatusCounts(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EquipmentService.getStatusCounts).toHaveBeenCalledWith(organizations.acme.id);
      expect(result.current.data).toEqual(mockCounts);
    });

    it('returns zero counts when no organization', async () => {
      const { result } = renderHook(
        () => useEquipmentStatusCounts(undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe('idle');
    });

    it('returns zero counts on error', async () => {
      vi.mocked(EquipmentService.getStatusCounts).mockResolvedValueOnce({
        success: false,
        error: 'Failed to fetch counts'
      });

      const { result } = renderHook(
        () => useEquipmentStatusCounts(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ active: 0, maintenance: 0, inactive: 0 });
    });
  });

  describe('useEquipmentManufacturersAndModels', () => {
    beforeEach(() => {
      vi.mocked(EquipmentService.getAll).mockResolvedValue({
        success: true,
        data: Object.values(equipment)
      });
    });

    it('groups equipment by manufacturer with their models', async () => {
      const { result } = renderHook(
        () => useEquipmentManufacturersAndModels(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should return grouped manufacturers with their models
      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
      
      // Check that Toyota is in the list (from forklift fixtures)
      const toyota = result.current.data?.find(m => m.manufacturer === 'Toyota');
      expect(toyota).toBeDefined();
      expect(toyota?.models).toContain('8FGU25');
    });

    it('returns empty array when no organization', async () => {
      const { result } = renderHook(
        () => useEquipmentManufacturersAndModels(undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe('idle');
    });

    it('returns empty array on error', async () => {
      vi.mocked(EquipmentService.getAll).mockResolvedValueOnce({
        success: false,
        error: 'Failed to fetch'
      });

      const { result } = renderHook(
        () => useEquipmentManufacturersAndModels(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('sorts manufacturers and models alphabetically', async () => {
      const mixedEquipment = [
        { ...equipment.forklift1, manufacturer: 'Zebra', model: 'B-Model' },
        { ...equipment.forklift2, manufacturer: 'Apple', model: 'Z-Model' },
        { ...equipment.crane, manufacturer: 'Apple', model: 'A-Model' }
      ];

      vi.mocked(EquipmentService.getAll).mockResolvedValueOnce({
        success: true,
        data: mixedEquipment
      });

      const { result } = renderHook(
        () => useEquipmentManufacturersAndModels(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // First manufacturer should be Apple (alphabetically)
      expect(result.current.data?.[0]?.manufacturer).toBe('Apple');
      
      // Apple's models should be sorted
      const apple = result.current.data?.[0];
      expect(apple?.models[0]).toBe('A-Model');
      expect(apple?.models[1]).toBe('Z-Model');
    });

    it('handles equipment without manufacturer', async () => {
      const equipmentWithoutManufacturer = [
        { ...equipment.forklift1, manufacturer: null },
        { ...equipment.forklift2, manufacturer: 'Toyota', model: 'Model1' }
      ];

      vi.mocked(EquipmentService.getAll).mockResolvedValueOnce({
        success: true,
        data: equipmentWithoutManufacturer
      });

      const { result } = renderHook(
        () => useEquipmentManufacturersAndModels(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should only have Toyota (equipment without manufacturer is skipped)
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]?.manufacturer).toBe('Toyota');
    });
  });

  describe('Query Keys', () => {
    it('uses correct query key for equipment list', async () => {
      const filters = { status: 'active' as const };
      const pagination = { limit: 10 };
      
      const { result } = renderHook(
        () => useEquipment(organizations.acme.id, filters, pagination),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // The query was called with the right parameters
      expect(EquipmentService.getAll).toHaveBeenCalledWith(
        organizations.acme.id,
        filters,
        pagination
      );
    });

    it('uses correct query key for equipment by id', async () => {
      vi.mocked(EquipmentService.getById).mockResolvedValue({
        success: true,
        data: equipment.forklift1
      });

      const { result } = renderHook(
        () => useEquipmentById(organizations.acme.id, equipment.forklift1.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(EquipmentService.getById).toHaveBeenCalledWith(
        organizations.acme.id,
        equipment.forklift1.id
      );
    });
  });

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      vi.mocked(EquipmentService.getAll).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(
        () => useEquipment(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('handles service returning success false without error message', async () => {
      vi.mocked(EquipmentService.getAll).mockResolvedValueOnce({
        success: false
      });

      const { result } = renderHook(
        () => useEquipment(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Failed to fetch equipment');
    });
  });
});
