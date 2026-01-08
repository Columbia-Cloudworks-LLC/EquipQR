import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getEquipmentCardDisplayModel } from './getEquipmentCardDisplayModel';

describe('getEquipmentCardDisplayModel', () => {
  describe('imageAlt', () => {
    it('generates alt text from equipment name', () => {
      const result = getEquipmentCardDisplayModel({
        name: 'Forklift XL',
        status: 'active',
      });

      expect(result.imageAlt).toBe('Forklift XL equipment');
    });
  });

  describe('imageFallbackSrc', () => {
    it('returns placeholder.svg path', () => {
      const result = getEquipmentCardDisplayModel({
        name: 'Test Equipment',
        status: 'active',
      });

      expect(result.imageFallbackSrc).toBe('/placeholder.svg');
    });
  });

  describe('showStatusBadge', () => {
    it('returns false for active status', () => {
      const result = getEquipmentCardDisplayModel({
        name: 'Test Equipment',
        status: 'active',
      });

      expect(result.showStatusBadge).toBe(false);
    });

    it('returns true for maintenance status', () => {
      const result = getEquipmentCardDisplayModel({
        name: 'Test Equipment',
        status: 'maintenance',
      });

      expect(result.showStatusBadge).toBe(true);
    });

    it('returns true for inactive status', () => {
      const result = getEquipmentCardDisplayModel({
        name: 'Test Equipment',
        status: 'inactive',
      });

      expect(result.showStatusBadge).toBe(true);
    });
  });

  describe('statusText', () => {
    it('returns the raw status value', () => {
      const result = getEquipmentCardDisplayModel({
        name: 'Test Equipment',
        status: 'maintenance',
      });

      expect(result.statusText).toBe('maintenance');
    });
  });

  describe('statusClassName', () => {
    it('returns CSS variable-based classes for active status', () => {
      const result = getEquipmentCardDisplayModel({
        name: 'Test Equipment',
        status: 'active',
      });

      expect(result.statusClassName).toBe('bg-success/10 text-success border-success/20');
    });

    it('returns CSS variable-based classes for maintenance status', () => {
      const result = getEquipmentCardDisplayModel({
        name: 'Test Equipment',
        status: 'maintenance',
      });

      expect(result.statusClassName).toBe('bg-warning/10 text-warning border-warning/20');
    });

    it('returns CSS variable-based classes for inactive status', () => {
      const result = getEquipmentCardDisplayModel({
        name: 'Test Equipment',
        status: 'inactive',
      });

      expect(result.statusClassName).toBe('bg-muted text-muted-foreground border-border');
    });
  });

  describe('lastMaintenanceText', () => {
    let mockToLocaleDateString: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // Mock toLocaleDateString for consistent test results
      mockToLocaleDateString = vi.spyOn(Date.prototype, 'toLocaleDateString');
      mockToLocaleDateString.mockReturnValue('1/15/2026');
    });

    afterEach(() => {
      mockToLocaleDateString.mockRestore();
    });

    it('formats valid date correctly', () => {
      const result = getEquipmentCardDisplayModel({
        name: 'Test Equipment',
        status: 'active',
        last_maintenance: '2026-01-15',
      });

      expect(result.lastMaintenanceText).toBe('Last maintenance: 1/15/2026');
    });

    it('returns undefined when last_maintenance is not provided', () => {
      const result = getEquipmentCardDisplayModel({
        name: 'Test Equipment',
        status: 'active',
      });

      expect(result.lastMaintenanceText).toBeUndefined();
    });

    it('returns undefined for invalid date string', () => {
      mockToLocaleDateString.mockRestore();
      
      const result = getEquipmentCardDisplayModel({
        name: 'Test Equipment',
        status: 'active',
        last_maintenance: 'invalid-date',
      });

      expect(result.lastMaintenanceText).toBeUndefined();
    });
  });

  describe('workingHoursText', () => {
    it('formats working hours with locale string', () => {
      const result = getEquipmentCardDisplayModel({
        name: 'Test Equipment',
        status: 'active',
        working_hours: 1234,
      });

      expect(result.workingHoursText).toBe('1,234 hours');
    });

    it('defaults to 0 when working_hours is null', () => {
      const result = getEquipmentCardDisplayModel({
        name: 'Test Equipment',
        status: 'active',
        working_hours: null,
      });

      expect(result.workingHoursText).toBe('0 hours');
    });

    it('defaults to 0 when working_hours is undefined', () => {
      const result = getEquipmentCardDisplayModel({
        name: 'Test Equipment',
        status: 'active',
      });

      expect(result.workingHoursText).toBe('0 hours');
    });

    it('handles zero working hours', () => {
      const result = getEquipmentCardDisplayModel({
        name: 'Test Equipment',
        status: 'active',
        working_hours: 0,
      });

      expect(result.workingHoursText).toBe('0 hours');
    });
  });
});
