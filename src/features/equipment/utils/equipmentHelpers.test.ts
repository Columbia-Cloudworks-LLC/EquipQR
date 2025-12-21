import { describe, it, expect } from 'vitest';
import { getStatusColor, filterEquipment } from './equipmentHelpers';

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
    it('should return correct colors for each status', () => {
      expect(getStatusColor('active')).toBe('bg-green-100 text-green-800 border-green-200');
      expect(getStatusColor('maintenance')).toBe('bg-yellow-100 text-yellow-800 border-yellow-200');
      expect(getStatusColor('inactive')).toBe('bg-gray-100 text-gray-800 border-gray-200');
    });

    it('should handle unknown status', () => {
      expect(getStatusColor('unknown')).toBe('bg-gray-100 text-gray-800 border-gray-200');
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

  // Additional tests can be added as more utility functions are implemented
});