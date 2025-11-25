import { describe, it, expect } from 'vitest';
import { cn, isLightColor, dateToISOString } from './utils';

describe('utils', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const condition = true;
      const hiddenCondition = false;
      expect(cn('base', condition && 'conditional', hiddenCondition && 'hidden')).toBe('base conditional');
    });

    it('should handle undefined and null values', () => {
      expect(cn('base', undefined, null, 'end')).toBe('base end');
    });

    it('should merge Tailwind classes correctly', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2'); // Later class should override
    });

    it('should handle empty input', () => {
      expect(cn()).toBe('');
    });

    it('should handle array inputs', () => {
      expect(cn(['class1', 'class2'])).toBe('class1 class2');
    });

    it('should handle object inputs', () => {
      expect(cn({ 'class1': true, 'class2': false })).toBe('class1');
    });
  });

  describe('isLightColor', () => {
    it('should return true for light colors', () => {
      expect(isLightColor('#FFFFFF')).toBe(true); // White
      expect(isLightColor('#FFFF00')).toBe(true); // Yellow
      expect(isLightColor('#FFEFD5')).toBe(true); // Papaya Whip
      expect(isLightColor('#FFF')).toBe(true); // 3-char white
    });

    it('should return false for dark colors', () => {
      expect(isLightColor('#000000')).toBe(false); // Black
      expect(isLightColor('#000')).toBe(false); // 3-char black
      expect(isLightColor('#000080')).toBe(false); // Navy
      expect(isLightColor('#8B0000')).toBe(false); // Dark red
    });

    it('should handle 3-character hex codes', () => {
      expect(isLightColor('#F00')).toBe(false); // Red (dark)
      expect(isLightColor('#0F0')).toBe(true); // Lime (light)
      expect(isLightColor('#00F')).toBe(false); // Blue (dark)
    });

    it('should default to light for invalid colors', () => {
      expect(isLightColor('#')).toBe(true);
      expect(isLightColor('#12')).toBe(true);
      expect(isLightColor('#12345')).toBe(true);
      expect(isLightColor('#1234567')).toBe(true);
      expect(isLightColor('invalid')).toBe(true);
      expect(isLightColor('')).toBe(true);
    });

    it('should handle hex with # prefix', () => {
      expect(isLightColor('FFFFFF')).toBe(true);
      expect(isLightColor('000000')).toBe(false);
    });
  });

  describe('dateToISOString', () => {
    it('should convert Date to ISO string', () => {
      const date = new Date('2023-12-25T10:30:00Z');
      expect(dateToISOString(date)).toBe('2023-12-25T10:30:00.000Z');
    });

    it('should return undefined for null', () => {
      expect(dateToISOString(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(dateToISOString(undefined)).toBeUndefined();
    });

    it('should handle different date formats', () => {
      const date1 = new Date('2024-01-01');
      expect(dateToISOString(date1)).toMatch(/2024-01-01/);

      const date2 = new Date(1703520000000); // Unix timestamp
      expect(dateToISOString(date2)).toBeTruthy();
    });
  });
});