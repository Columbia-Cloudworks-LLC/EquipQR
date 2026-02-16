import { describe, it, expect } from 'vitest';
import { 
  getStatusColor, 
  getStatusTextColor,
  getStatusDisplayInfo,
  filterEquipment,
  formatDateForInput,
  safeFormatDate,
  EQUIPMENT_STATUS_OPTIONS
} from './equipmentHelpers';

describe('equipmentHelpers', () => {
  const mockEquipment = [
    {
      id: 'eq-1',
      name: 'Test Equipment',
      manufacturer: 'Test Manufacturer',
      model: 'Test Model',
      serial_number: 'SN123456',
      status: 'active',
      location: 'Warehouse A'
    },
    {
      id: 'eq-2',
      name: 'Another Equipment',
      manufacturer: 'Different Manufacturer',
      model: 'Different Model',
      serial_number: 'SN789012',
      status: 'maintenance',
      location: 'Warehouse B'
    }
  ];

  describe('getStatusColor', () => {
    it('should return CSS variable-based colors for each status', () => {
      expect(getStatusColor('active')).toBe('bg-success/10 text-success border-success/20');
      expect(getStatusColor('maintenance')).toBe('bg-warning/10 text-warning border-warning/20');
      expect(getStatusColor('inactive')).toBe('bg-muted text-muted-foreground border-border');
    });

    it('should handle unknown status with muted colors', () => {
      expect(getStatusColor('unknown')).toBe('bg-muted text-muted-foreground border-border');
    });
  });

  describe('getStatusTextColor', () => {
    it('should return text color classes for each status', () => {
      expect(getStatusTextColor('active')).toBe('text-green-600');
      expect(getStatusTextColor('maintenance')).toBe('text-yellow-600');
      expect(getStatusTextColor('inactive')).toBe('text-gray-600');
    });

    it('should handle unknown status with gray color', () => {
      expect(getStatusTextColor('unknown')).toBe('text-gray-600');
    });
  });

  describe('getStatusDisplayInfo', () => {
    it('should return complete display info for active status', () => {
      const info = getStatusDisplayInfo('active');
      expect(info.label).toBe('Active');
      expect(info.badgeClassName).toBe('bg-success/10 text-success border-success/20');
      expect(info.textClassName).toBe('text-green-600');
    });

    it('should return complete display info for maintenance status', () => {
      const info = getStatusDisplayInfo('maintenance');
      expect(info.label).toBe('Under Maintenance');
      expect(info.badgeClassName).toBe('bg-warning/10 text-warning border-warning/20');
      expect(info.textClassName).toBe('text-yellow-600');
    });

    it('should return complete display info for inactive status', () => {
      const info = getStatusDisplayInfo('inactive');
      expect(info.label).toBe('Inactive');
      expect(info.badgeClassName).toBe('bg-muted text-muted-foreground border-border');
      expect(info.textClassName).toBe('text-gray-600');
    });

    it('should default to Active label for unknown status', () => {
      const info = getStatusDisplayInfo('unknown');
      expect(info.label).toBe('Active');
    });
  });

  describe('EQUIPMENT_STATUS_OPTIONS', () => {
    it('should contain all three status options', () => {
      expect(EQUIPMENT_STATUS_OPTIONS).toHaveLength(3);
    });

    it('should have correct values and labels', () => {
      expect(EQUIPMENT_STATUS_OPTIONS).toEqual([
        { value: 'active', label: 'Active' },
        { value: 'maintenance', label: 'Under Maintenance' },
        { value: 'inactive', label: 'Inactive' },
      ]);
    });
  });

  describe('filterEquipment', () => {
    it('should filter equipment by search query', () => {
      const filtered = filterEquipment(mockEquipment, 'Test', 'all');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Test Equipment');
    });

    it('should filter equipment by status', () => {
      const filtered = filterEquipment(mockEquipment, '', 'active');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe('active');
    });

    it('should filter by both search and status', () => {
      const filtered = filterEquipment(mockEquipment, 'Equipment', 'maintenance');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Another Equipment');
    });
  });

  describe('formatDateForInput', () => {
    it('should format valid date to YYYY-MM-DD format', () => {
      expect(formatDateForInput('2026-01-15T12:00:00Z')).toBe('2026-01-15');
      expect(formatDateForInput('2026-12-31')).toBe('2026-12-31');
    });

    it('should return empty string for null', () => {
      expect(formatDateForInput(null)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDateForInput('invalid-date')).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(formatDateForInput('')).toBe('');
    });
  });

  describe('safeFormatDate', () => {
    it('should format valid date to locale string', () => {
      const result = safeFormatDate('2026-01-15');
      expect(result).not.toBeNull();
      // The exact format depends on locale, so just check it's a non-empty string
      expect(typeof result).toBe('string');
      expect(result!.length).toBeGreaterThan(0);
    });

    it('should return null for invalid date', () => {
      expect(safeFormatDate('invalid-date')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(safeFormatDate('')).toBeNull();
    });
  });
});