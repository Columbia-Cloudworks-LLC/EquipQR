/**
 * useEquipment Hook Tests
 * 
 * Tests the equipment data fetching hooks with different
 * query scenarios and filter combinations.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQueryClientWrapper, waitForHookSuccess } from '@vitest-harness/utils/test-utils';
import {
  useEquipment,
  useEquipmentById,
  useEquipmentScans,
  useEquipmentManufacturersAndModels
} from './useEquipment';
import {
  equipment,
  organizations,
  teams,
  type TestEquipment,
} from '@vitest-harness/fixtures/entities';
import type { ApiResponse } from '@/services/base/BaseService';
import type {
  EquipmentScan,
  EquipmentSummary,
  EquipmentWithTeam,
} from '@/features/equipment/services/EquipmentService';

// Mock the EquipmentService
vi.mock('@/features/equipment/services/EquipmentService', () => ({
  EquipmentService: {
    getAll: vi.fn(),
    getSummaries: vi.fn(),
    getById: vi.fn(),
    getScansByEquipmentId: vi.fn(),
    getWorkOrdersByEquipmentId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    createScan: vi.fn()
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

const createWrapper = createQueryClientWrapper;

const apiSuccess = <T,>(data: T): ApiResponse<T> => ({ success: true, data, error: null });
const apiFailure = <T,>(error: string | null): ApiResponse<T> => ({ success: false, data: null, error });

/** Expand a catalog fixture into a complete `equipment` row. */
const toEquipmentRow = (fixture: TestEquipment): EquipmentWithTeam => ({
  id: fixture.id,
  name: fixture.name,
  manufacturer: fixture.manufacturer,
  model: fixture.model,
  serial_number: fixture.serial_number,
  status: fixture.status,
  location: fixture.location ?? '',
  team_id: fixture.team_id,
  organization_id: fixture.organization_id,
  default_pm_template_id: fixture.default_pm_template_id ?? null,
  notes: fixture.notes ?? null,
  custom_attributes: fixture.custom_attributes ?? null,
  assigned_location_city: null,
  assigned_location_country: null,
  assigned_location_lat: null,
  assigned_location_lng: null,
  assigned_location_state: null,
  assigned_location_street: null,
  created_at: '2024-01-01T00:00:00Z',
  customer_id: null,
  image_url: null,
  import_id: null,
  installation_date: '2024-01-01',
  last_known_location: null,
  last_maintenance: null,
  last_maintenance_work_order_id: null,
  updated_at: '2024-01-01T00:00:00Z',
  use_team_location: false,
  warranty_expiration: null,
  working_hours: null,
});

/** Expand a catalog fixture into an `EquipmentSummary` projection. */
const toEquipmentSummary = (
  fixture: TestEquipment,
  overrides: Partial<EquipmentSummary> = {},
): EquipmentSummary => ({
  id: fixture.id,
  organization_id: fixture.organization_id,
  name: fixture.name,
  manufacturer: fixture.manufacturer,
  model: fixture.model,
  serial_number: fixture.serial_number,
  status: fixture.status,
  team_id: fixture.team_id,
  location: fixture.location ?? null,
  image_url: null,
  working_hours: null,
  last_maintenance: null,
  last_known_location: null,
  default_pm_template_id: fixture.default_pm_template_id ?? null,
  ...overrides,
});

describe('useEquipment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEquipment (main hook)', () => {
    beforeEach(() => {
      vi.mocked(EquipmentService.getAll).mockResolvedValue(
        apiSuccess(Object.values(equipment).map(toEquipmentRow))
      );
    });

    it('fetches equipment for organization', async () => {
      const { result } = renderHook(
        () => useEquipment(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitForHookSuccess(result);

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

      await waitForHookSuccess(result);

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

      await waitForHookSuccess(result);

      expect(EquipmentService.getAll).toHaveBeenCalledWith(
        organizations.acme.id,
        {},
        pagination
      );
    });

    it('handles API errors', async () => {
      vi.mocked(EquipmentService.getAll).mockResolvedValueOnce(
        apiFailure('Failed to fetch equipment')
      );

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

  describe('useEquipmentById', () => {
    beforeEach(() => {
      vi.mocked(EquipmentService.getById).mockResolvedValue(
        apiSuccess(toEquipmentRow(equipment.forklift1))
      );
    });

    it('fetches single equipment by id for org admins without a team filter', async () => {
      const { result } = renderHook(
        () =>
          useEquipmentById(organizations.acme.id, equipment.forklift1.id, {
            isOrgAdmin: true,
          }),
        { wrapper: createWrapper() }
      );

      await waitForHookSuccess(result);

      expect(EquipmentService.getById).toHaveBeenCalledWith(
        organizations.acme.id,
        equipment.forklift1.id,
        { userTeamIds: undefined, isOrgAdmin: true },
      );
      expect(result.current.data?.id).toBe(equipment.forklift1.id);
    });

    it('fails closed to an empty team list when RBAC options are omitted', async () => {
      const { result } = renderHook(
        () => useEquipmentById(organizations.acme.id, equipment.forklift1.id),
        { wrapper: createWrapper() }
      );

      await waitForHookSuccess(result);

      expect(EquipmentService.getById).toHaveBeenCalledWith(
        organizations.acme.id,
        equipment.forklift1.id,
        { userTeamIds: [], isOrgAdmin: false },
      );
    });

    it('does not fetch until enabled after team membership resolves', () => {
      const { result } = renderHook(
        () =>
          useEquipmentById(organizations.acme.id, equipment.forklift1.id, {
            userTeamIds: ['team-cs'],
            isOrgAdmin: false,
            enabled: false,
          }),
        { wrapper: createWrapper() },
      );

      expect(result.current.fetchStatus).toBe('idle');
      expect(EquipmentService.getById).not.toHaveBeenCalled();
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
      vi.mocked(EquipmentService.getById).mockResolvedValueOnce(
        apiFailure('Equipment not found')
      );

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

  describe('useEquipmentScans', () => {
    const mockScans: EquipmentScan[] = [
      {
        id: 'scan-1',
        equipment_id: equipment.forklift1.id,
        scanned_at: new Date().toISOString(),
        scanned_by: 'user-1',
        scanned_by_name: null,
        location: null,
        notes: null,
      }
    ];

    beforeEach(() => {
      vi.mocked(EquipmentService.getScansByEquipmentId).mockResolvedValue(
        apiSuccess(mockScans)
      );
    });

    it('fetches scans for equipment', async () => {
      const { result } = renderHook(
        () => useEquipmentScans(organizations.acme.id, equipment.forklift1.id),
        { wrapper: createWrapper() }
      );

      await waitForHookSuccess(result);

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

  describe('useEquipmentManufacturersAndModels', () => {
    beforeEach(() => {
      // The hook now reads from the lightweight summaries endpoint instead of
      // `getAll`. The summary projection includes manufacturer/model directly.
      vi.mocked(EquipmentService.getSummaries).mockResolvedValue(
        apiSuccess(Object.values(equipment).map((fixture) => toEquipmentSummary(fixture)))
      );
    });

    it('groups equipment by manufacturer with their models', async () => {
      const { result } = renderHook(
        () => useEquipmentManufacturersAndModels(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitForHookSuccess(result);

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
      vi.mocked(EquipmentService.getSummaries).mockResolvedValueOnce(
        apiFailure('Failed to fetch')
      );

      const { result } = renderHook(
        () => useEquipmentManufacturersAndModels(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitForHookSuccess(result);

      expect(result.current.data).toEqual([]);
    });

    it('sorts manufacturers and models alphabetically', async () => {
      const mixedEquipment = [
        toEquipmentSummary(equipment.forklift1, { manufacturer: 'Zebra', model: 'B-Model' }),
        toEquipmentSummary(equipment.forklift2, { manufacturer: 'Apple', model: 'Z-Model' }),
        toEquipmentSummary(equipment.crane, { manufacturer: 'Apple', model: 'A-Model' })
      ];

      vi.mocked(EquipmentService.getSummaries).mockResolvedValueOnce(apiSuccess(mixedEquipment));

      const { result } = renderHook(
        () => useEquipmentManufacturersAndModels(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitForHookSuccess(result);

      // First manufacturer should be Apple (alphabetically)
      expect(result.current.data?.[0]?.manufacturer).toBe('Apple');
      
      // Apple's models should be sorted
      const apple = result.current.data?.[0];
      expect(apple?.models[0]).toBe('A-Model');
      expect(apple?.models[1]).toBe('Z-Model');
    });

    it('handles equipment without manufacturer', async () => {
      const equipmentWithoutManufacturer = [
        toEquipmentSummary(equipment.forklift1, { manufacturer: null }),
        toEquipmentSummary(equipment.forklift2, { manufacturer: 'Toyota', model: 'Model1' })
      ];

      vi.mocked(EquipmentService.getSummaries).mockResolvedValueOnce(
        apiSuccess(equipmentWithoutManufacturer)
      );

      const { result } = renderHook(
        () => useEquipmentManufacturersAndModels(organizations.acme.id),
        { wrapper: createWrapper() }
      );

      await waitForHookSuccess(result);

      // Should only have Toyota (equipment without manufacturer is skipped)
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]?.manufacturer).toBe('Toyota');
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
      vi.mocked(EquipmentService.getAll).mockResolvedValueOnce(apiFailure<EquipmentWithTeam[]>(null));

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
