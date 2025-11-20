import { describe, it, expect } from 'vitest';
import { parseLatLng, normalizeAddress } from './geoUtils';

describe('geoUtils', () => {
  describe('parseLatLng', () => {
    it('should parse valid lat/lng string', () => {
      expect(parseLatLng('41.2345, -90.1234')).toEqual({ lat: 41.2345, lng: -90.1234 });
    });

    it('should handle spaces correctly', () => {
      expect(parseLatLng('41.2345,-90.1234')).toEqual({ lat: 41.2345, lng: -90.1234 });
      expect(parseLatLng('  41.2345  ,  -90.1234  ')).toEqual({ lat: 41.2345, lng: -90.1234 });
    });

    it('should return null for invalid input', () => {
      expect(parseLatLng('')).toBeNull();
      expect(parseLatLng('invalid')).toBeNull();
      expect(parseLatLng('41.2345')).toBeNull(); // Missing lng
      expect(parseLatLng('41.2345, -90.1234, extra')).toBeNull(); // Too many parts
    });

    it('should return null for non-string input', () => {
      expect(parseLatLng(null as unknown as string)).toBeNull();
      expect(parseLatLng(undefined as unknown as string)).toBeNull();
      expect(parseLatLng(123 as unknown as string)).toBeNull();
    });

    it('should return null for invalid coordinates', () => {
      expect(parseLatLng('invalid, -90.1234')).toBeNull();
      expect(parseLatLng('41.2345, invalid')).toBeNull();
      expect(parseLatLng('NaN, -90.1234')).toBeNull();
    });

    it('should validate coordinate ranges', () => {
      expect(parseLatLng('91, 0')).toBeNull(); // Lat out of range
      expect(parseLatLng('-91, 0')).toBeNull(); // Lat out of range
      expect(parseLatLng('0, 181')).toBeNull(); // Lng out of range
      expect(parseLatLng('0, -181')).toBeNull(); // Lng out of range
      expect(parseLatLng('90, 180')).toEqual({ lat: 90, lng: 180 }); // Valid boundaries
      expect(parseLatLng('-90, -180')).toEqual({ lat: -90, lng: -180 }); // Valid boundaries
    });
  });

  describe('normalizeAddress', () => {
    it('should normalize address correctly', () => {
      expect(normalizeAddress('123 Main St')).toBe('123 main st');
      expect(normalizeAddress('  123 MAIN ST  ')).toBe('123 main st');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeAddress('123   Main     St')).toBe('123 main st');
      expect(normalizeAddress('123\tMain\nSt')).toBe('123 main st');
    });

    it('should handle empty input', () => {
      expect(normalizeAddress('')).toBe('');
      expect(normalizeAddress('   ')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(normalizeAddress(null as unknown as string)).toBe('');
      expect(normalizeAddress(undefined as unknown as string)).toBe('');
      expect(normalizeAddress(123 as unknown as string)).toBe('');
    });
  });
});

