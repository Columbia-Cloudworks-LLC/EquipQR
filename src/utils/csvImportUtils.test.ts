import { describe, it, expect } from 'vitest';
import { normalizeHeader, autoMapHeaders } from './csvImportUtils';

describe('csvImportUtils', () => {
  describe('normalizeHeader', () => {
    it('should normalize headers with underscores and hyphens', () => {
      expect(normalizeHeader('Serial_Number')).toBe('serial number');
      expect(normalizeHeader('serial-number')).toBe('serial number');
      expect(normalizeHeader('Serial Number')).toBe('serial number');
      expect(normalizeHeader('SERIAL_NO')).toBe('serial no');
    });

    it('should handle special characters and spaces', () => {
      expect(normalizeHeader('Serial#')).toBe('serial');
      expect(normalizeHeader('S/N')).toBe('s n');
      expect(normalizeHeader('  Serial   Number  ')).toBe('serial number');
    });
  });

  describe('autoMapHeaders', () => {
    it('should map standard serial number variations', () => {
      const headers = ['Serial Number', 'Equipment Name', 'Model'];
      const mappings = autoMapHeaders(headers);
      
      expect(mappings[0].mappedTo).toBe('serial');
      expect(mappings[1].mappedTo).toBe('name');
      expect(mappings[2].mappedTo).toBe('model');
    });

    it('should use starts-with heuristic for serial fields', () => {
      const headers = ['Serial Code', 'Serial ID', 'Serial Tag'];
      const mappings = autoMapHeaders(headers);
      
      expect(mappings[0].mappedTo).toBe('serial');
      // Only first serial field should be mapped, others should be custom
      expect(mappings[1].mappedTo).toBe('custom');
      expect(mappings[2].mappedTo).toBe('custom');
    });

    it('should handle SN variations', () => {
      const headers = ['SN', 'S/N', 'S N'];
      const mappings = autoMapHeaders(headers);
      
      expect(mappings[0].mappedTo).toBe('serial');
    });

    it('should prioritize exact matches over starts-with', () => {
      const headers = ['serial', 'Serial Number Extra Info'];
      const mappings = autoMapHeaders(headers);
      
      expect(mappings[0].mappedTo).toBe('serial');
      expect(mappings[1].mappedTo).toBe('custom'); // Should not map second one
    });

    it('should not duplicate serial mappings', () => {
      const headers = ['Serial', 'Serial Number', 'Serial Code'];
      const mappings = autoMapHeaders(headers);
      
      const serialMappings = mappings.filter(m => m.mappedTo === 'serial');
      expect(serialMappings).toHaveLength(1);
    });
  });

});