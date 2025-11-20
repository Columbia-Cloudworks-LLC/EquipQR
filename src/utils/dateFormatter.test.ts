import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatDateInUserSettings, formatTimeInUserSettings, formatRelativeDate } from './dateFormatter';
import { UserSettings } from '@/types/settings';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn()
  }
}));

describe('dateFormatter', () => {
  const mockSettings: UserSettings = {
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatDateInUserSettings', () => {
    it('formats date correctly without time', () => {
      const date = new Date('2023-12-25T10:30:00Z');
      const formatted = formatDateInUserSettings(date, mockSettings);
      // Should format based on timezone and date format
      expect(formatted).toMatch(/12\/25\/2023/);
    });

    it('formats date correctly with time when includeTime is true', () => {
      const date = new Date('2023-12-25T10:30:00Z');
      const formatted = formatDateInUserSettings(date, mockSettings, true);
      // Should include time pattern
      expect(formatted).toMatch(/12\/25\/2023/);
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s+(AM|PM)/);
    });

    it('handles string date input', () => {
      const dateString = '2023-12-25T10:30:00Z';
      const formatted = formatDateInUserSettings(dateString, mockSettings);
      expect(formatted).toMatch(/12\/25\/2023/);
    });

    it('handles different date formats', () => {
      const date = new Date('2023-12-25T10:30:00Z');
      const settingsDDMM: UserSettings = { ...mockSettings, dateFormat: 'dd/MM/yyyy' };
      const formatted = formatDateInUserSettings(date, settingsDDMM);
      expect(formatted).toMatch(/25\/12\/2023/);
    });
  });

  describe('formatTimeInUserSettings', () => {
    it('formats time correctly', () => {
      const date = new Date('2023-12-25T14:30:00Z');
      const formatted = formatTimeInUserSettings(date, mockSettings);
      // Should format as 12-hour time with AM/PM
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s+(AM|PM)/);
    });

    it('handles string date input', () => {
      const dateString = '2023-12-25T14:30:00Z';
      const formatted = formatTimeInUserSettings(dateString, mockSettings);
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s+(AM|PM)/);
    });
  });

  describe('formatRelativeDate', () => {
    it('formats time for dates less than 24 hours ago', () => {
      const date = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const formatted = formatRelativeDate(date, mockSettings);
      // Should return time format
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s+(AM|PM)/);
    });

    it('formats day and time for dates within a week', () => {
      const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const formatted = formatRelativeDate(date, mockSettings);
      // Should return day and time
      expect(formatted).toMatch(/\w{3}\s+\d{1,2}:\d{2}\s+(AM|PM)/);
    });

    it('formats full date for dates more than a week ago', () => {
      const date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const formatted = formatRelativeDate(date, mockSettings);
      // Should return full date format
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('handles string date input', () => {
      const dateString = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const formatted = formatRelativeDate(dateString, mockSettings);
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s+(AM|PM)/);
    });
  });

});