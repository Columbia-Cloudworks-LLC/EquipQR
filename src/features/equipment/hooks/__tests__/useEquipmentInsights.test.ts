import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { 
  useEquipmentInsights, 
  getStatusPercentage, 
  truncateText 
} from '../useEquipmentInsights';

describe('useEquipmentInsights', () => {
  // Use fake timers for all tests in this suite
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createEquipment = (overrides = {}) => ({
    id: 'eq-1',
    name: 'Test Equipment',
    manufacturer: 'Test Manufacturer',
    model: 'Test Model',
    serial_number: 'SN123456',
    status: 'active',
    location: 'Warehouse A',
    installation_date: '2024-01-15',
    warranty_expiration: undefined,
    last_maintenance: undefined,
    team_id: undefined,
    ...overrides,
  });

  const mockEquipment = [
    createEquipment({ id: 'eq-1', status: 'active', location: 'Warehouse A', manufacturer: 'Caterpillar' }),
    createEquipment({ id: 'eq-2', status: 'active', location: 'Warehouse A', manufacturer: 'Caterpillar' }),
    createEquipment({ id: 'eq-3', status: 'maintenance', location: 'Warehouse B', manufacturer: 'John Deere' }),
    createEquipment({ id: 'eq-4', status: 'inactive', location: 'Warehouse C', manufacturer: 'Komatsu' }),
    createEquipment({ id: 'eq-5', status: 'active', location: 'Warehouse B', manufacturer: 'Caterpillar' }),
  ];

  describe('basic counts', () => {
    it('returns correct total and filtered counts', () => {
      const { result } = renderHook(() => 
        useEquipmentInsights(mockEquipment, mockEquipment)
      );

      expect(result.current.totalEquipment).toBe(5);
      expect(result.current.filteredTotal).toBe(5);
      expect(result.current.hasFiltersApplied).toBe(false);
    });

    it('detects when filters are applied', () => {
      const filteredEquipment = mockEquipment.filter(e => e.status === 'active');
      
      const { result } = renderHook(() => 
        useEquipmentInsights(mockEquipment, filteredEquipment)
      );

      expect(result.current.totalEquipment).toBe(5);
      expect(result.current.filteredTotal).toBe(3);
      expect(result.current.hasFiltersApplied).toBe(true);
    });
  });

  describe('statusCounts', () => {
    it('calculates correct status counts', () => {
      const { result } = renderHook(() => 
        useEquipmentInsights(mockEquipment, mockEquipment)
      );

      expect(result.current.statusCounts).toEqual({
        active: 3,
        maintenance: 1,
        inactive: 1,
      });
    });

    it('returns zeros for empty equipment list', () => {
      const { result } = renderHook(() => 
        useEquipmentInsights([], [])
      );

      expect(result.current.statusCounts).toEqual({
        active: 0,
        maintenance: 0,
        inactive: 0,
      });
    });
  });

  describe('maintenanceInsights', () => {
    it('counts equipment needing maintenance', () => {
      const { result } = renderHook(() => 
        useEquipmentInsights(mockEquipment, mockEquipment)
      );

      expect(result.current.maintenanceInsights.needsMaintenance).toBe(1);
    });

    it('calculates maintenance rate as percentage', () => {
      const { result } = renderHook(() => 
        useEquipmentInsights(mockEquipment, mockEquipment)
      );

      // 1 out of 5 = 20%
      expect(result.current.maintenanceInsights.maintenanceRate).toBe(20);
    });

    it('counts recently maintained equipment', () => {
      const recentlyMaintainedEquipment = [
        createEquipment({ id: 'eq-1', last_maintenance: '2026-01-14' }), // 1 day ago
        createEquipment({ id: 'eq-2', last_maintenance: '2026-01-10' }), // 5 days ago
        createEquipment({ id: 'eq-3', last_maintenance: '2026-01-01' }), // 14 days ago (not recent)
      ];

      const { result } = renderHook(() => 
        useEquipmentInsights(recentlyMaintainedEquipment, recentlyMaintainedEquipment)
      );

      expect(result.current.maintenanceInsights.recentlyMaintained).toBe(2);
    });

    it('returns zero maintenance rate for empty list', () => {
      const { result } = renderHook(() => 
        useEquipmentInsights([], [])
      );

      expect(result.current.maintenanceInsights.maintenanceRate).toBe(0);
    });
  });

  describe('warrantyInsights', () => {
    it('counts warranties expiring within 30 days', () => {
      const equipmentWithWarranty = [
        createEquipment({ id: 'eq-1', warranty_expiration: '2026-01-20' }), // 5 days - expiring soon
        createEquipment({ id: 'eq-2', warranty_expiration: '2026-02-10' }), // 26 days - expiring soon
        createEquipment({ id: 'eq-3', warranty_expiration: '2026-03-15' }), // 59 days - not expiring soon
      ];

      const { result } = renderHook(() => 
        useEquipmentInsights(equipmentWithWarranty, equipmentWithWarranty)
      );

      expect(result.current.warrantyInsights.expiringSoon).toBe(2);
    });

    it('counts expired warranties', () => {
      const equipmentWithExpiredWarranty = [
        createEquipment({ id: 'eq-1', warranty_expiration: '2025-12-01' }), // expired
        createEquipment({ id: 'eq-2', warranty_expiration: '2026-01-10' }), // expired (5 days ago)
        createEquipment({ id: 'eq-3', warranty_expiration: '2026-02-15' }), // not expired
      ];

      const { result } = renderHook(() => 
        useEquipmentInsights(equipmentWithExpiredWarranty, equipmentWithExpiredWarranty)
      );

      expect(result.current.warrantyInsights.expired).toBe(2);
    });

    it('sets hasWarrantyIssues when there are expiring or expired warranties', () => {
      const equipmentWithIssues = [
        createEquipment({ id: 'eq-1', warranty_expiration: '2026-01-20' }),
      ];

      const { result } = renderHook(() => 
        useEquipmentInsights(equipmentWithIssues, equipmentWithIssues)
      );

      expect(result.current.warrantyInsights.hasWarrantyIssues).toBe(true);
    });

    it('sets hasWarrantyIssues to false when no issues', () => {
      const equipmentNoIssues = [
        createEquipment({ id: 'eq-1', warranty_expiration: '2027-01-15' }),
      ];

      const { result } = renderHook(() => 
        useEquipmentInsights(equipmentNoIssues, equipmentNoIssues)
      );

      expect(result.current.warrantyInsights.hasWarrantyIssues).toBe(false);
    });
  });

  describe('topLocations', () => {
    it('returns locations sorted by count descending', () => {
      const { result } = renderHook(() => 
        useEquipmentInsights(mockEquipment, mockEquipment)
      );

      expect(result.current.topLocations[0]).toEqual({
        location: 'Warehouse A',
        count: 2,
      });
      expect(result.current.topLocations[1]).toEqual({
        location: 'Warehouse B',
        count: 2,
      });
    });

    it('limits to top 5 locations', () => {
      const manyLocations = [
        createEquipment({ id: '1', location: 'Loc A' }),
        createEquipment({ id: '2', location: 'Loc B' }),
        createEquipment({ id: '3', location: 'Loc C' }),
        createEquipment({ id: '4', location: 'Loc D' }),
        createEquipment({ id: '5', location: 'Loc E' }),
        createEquipment({ id: '6', location: 'Loc F' }),
        createEquipment({ id: '7', location: 'Loc G' }),
      ];

      const { result } = renderHook(() => 
        useEquipmentInsights(manyLocations, manyLocations)
      );

      expect(result.current.topLocations).toHaveLength(5);
    });

    it('returns empty array for empty equipment list', () => {
      const { result } = renderHook(() => 
        useEquipmentInsights([], [])
      );

      expect(result.current.topLocations).toEqual([]);
    });
  });

  describe('topManufacturers', () => {
    it('returns manufacturers sorted by count descending', () => {
      const { result } = renderHook(() => 
        useEquipmentInsights(mockEquipment, mockEquipment)
      );

      expect(result.current.topManufacturers[0]).toEqual({
        manufacturer: 'Caterpillar',
        count: 3,
      });
    });

    it('limits to top 5 manufacturers', () => {
      const manyManufacturers = [
        createEquipment({ id: '1', manufacturer: 'Mfg A' }),
        createEquipment({ id: '2', manufacturer: 'Mfg B' }),
        createEquipment({ id: '3', manufacturer: 'Mfg C' }),
        createEquipment({ id: '4', manufacturer: 'Mfg D' }),
        createEquipment({ id: '5', manufacturer: 'Mfg E' }),
        createEquipment({ id: '6', manufacturer: 'Mfg F' }),
        createEquipment({ id: '7', manufacturer: 'Mfg G' }),
      ];

      const { result } = renderHook(() => 
        useEquipmentInsights(manyManufacturers, manyManufacturers)
      );

      expect(result.current.topManufacturers).toHaveLength(5);
    });
  });
});

describe('getStatusPercentage', () => {
  it('calculates percentage correctly', () => {
    expect(getStatusPercentage(25, 100)).toBe(25);
    expect(getStatusPercentage(1, 3)).toBe(33);
    expect(getStatusPercentage(2, 3)).toBe(67);
  });

  it('returns 0 for zero total', () => {
    expect(getStatusPercentage(5, 0)).toBe(0);
  });

  it('handles zero count', () => {
    expect(getStatusPercentage(0, 100)).toBe(0);
  });
});

describe('truncateText', () => {
  it('returns original text if within limit', () => {
    expect(truncateText('Short text')).toBe('Short text');
  });

  it('truncates text exceeding default limit with ellipsis', () => {
    expect(truncateText('This is a very long location name')).toBe('This is a very ...');
  });

  it('respects custom maxLength parameter', () => {
    expect(truncateText('Long text here', 5)).toBe('Long ...');
  });

  it('handles text exactly at limit', () => {
    expect(truncateText('Exactly fifteen', 15)).toBe('Exactly fifteen');
  });
});
