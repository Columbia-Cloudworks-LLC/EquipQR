import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, getRelativeTime } from './basicDateFormatter';

describe('basicDateFormatter', () => {
  describe('formatDate', () => {
    it('should format a valid ISO date string', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const result = formatDate(dateString);
      expect(result).toBe('Jan 15, 2024');
    });

    it('should return "Invalid date" for invalid date string', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('Invalid date');
    });

    it('should return "Invalid date" for empty string', () => {
      const result = formatDate('');
      expect(result).toBe('Invalid date');
    });

    it('should handle different date formats', () => {
      const dateString = '2023-12-25';
      const result = formatDate(dateString);
      expect(result).toBe('Dec 25, 2023');
    });
  });

  describe('formatDateTime', () => {
    it('should format a valid ISO date string with time', () => {
      const dateString = '2024-01-15T14:30:00Z';
      const result = formatDateTime(dateString);
      // Note: The exact format depends on timezone, so we just check it includes expected parts
      expect(result).toMatch(/Jan 15, 2024/);
      expect(result).toMatch(/\d+:\d+ (AM|PM)/);
    });

    it('should return "Invalid date" for invalid date string', () => {
      const result = formatDateTime('invalid-date');
      expect(result).toBe('Invalid date');
    });

    it('should return "Invalid date" for empty string', () => {
      const result = formatDateTime('');
      expect(result).toBe('Invalid date');
    });

    it('should handle date-only strings by adding default time', () => {
      const dateString = '2023-12-25';
      const result = formatDateTime(dateString);
      expect(result).toMatch(/Dec 25, 2023/);
    });
  });

  describe('getRelativeTime', () => {
    it('should return "just now" for dates less than 1 minute ago', () => {
      const now = new Date();
      const dateString = now.toISOString();
      const result = getRelativeTime(dateString);
      expect(result).toBe('just now');
    });

    it('should return relative time for dates more than 1 minute ago', () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 30);
      const dateString = pastDate.toISOString();
      const result = getRelativeTime(dateString);
      expect(result).toMatch(/ago|minute|hour/);
    });

    it('should return "Invalid date" for invalid date string', () => {
      const result = getRelativeTime('invalid-date');
      expect(result).toBe('Invalid date');
    });

    it('should return "Invalid date" for empty string', () => {
      const result = getRelativeTime('');
      expect(result).toBe('Invalid date');
    });

    it('should handle future dates', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2);
      const dateString = futureDate.toISOString();
      const result = getRelativeTime(dateString);
      // Should return relative time (e.g., "in 2 hours")
      expect(result).toBeTruthy();
      expect(result).not.toBe('Invalid date');
    });

    it('should handle dates exactly 1 minute ago', () => {
      const pastDate = new Date();
      pastDate.setSeconds(pastDate.getSeconds() - 61); // 61 seconds ago
      const dateString = pastDate.toISOString();
      const result = getRelativeTime(dateString);
      // Should not be "just now" since it's more than 1 minute
      expect(result).not.toBe('just now');
      expect(result).not.toBe('Invalid date');
    });
  });
});

