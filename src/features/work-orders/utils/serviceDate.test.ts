import { describe, expect, it } from 'vitest';
import {
  isSameServiceDay,
  parseServiceDateInput,
  serviceDateDaysAgo,
  serviceDateInputValue,
  todayServiceDate,
} from './serviceDate';

describe('serviceDate', () => {
  const now = new Date(2026, 10, 10, 23, 45); // late evening, local time

  it('stores the same calendar day locally and in UTC, so the database cast keeps it', () => {
    // Run in any timezone; CI is UTC and the cases below were checked under
    // Pacific/Kiritimati (+14), Pacific/Auckland (+13 DST), Asia/Kolkata (+5:30),
    // America/Los_Angeles and Etc/GMT+12 (-12).
    const dates = [
      todayServiceDate(now),
      serviceDateDaysAgo(1, now),
      parseServiceDateInput('2024-03-05'),
      parseServiceDateInput('2026-03-08'), // US DST change
      parseServiceDateInput('2026-04-05'), // NZ DST change
      parseServiceDateInput('2026-12-31'),
    ];

    expect(serviceDateInputValue(dates[0])).toBe('2026-11-10');
    for (const date of dates) {
      expect(date).not.toBeNull();
      expect(date?.toISOString().slice(0, 10)).toBe(serviceDateInputValue(date));
    }
  });

  it('counts back whole calendar days, across month boundaries', () => {
    expect(serviceDateInputValue(serviceDateDaysAgo(1, now))).toBe('2026-11-09');
    expect(serviceDateInputValue(serviceDateDaysAgo(10, now))).toBe('2026-10-31');
  });

  it('round-trips date input values', () => {
    const parsed = parseServiceDateInput('2024-03-05');

    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2024);
    expect(parsed?.getMonth()).toBe(2);
    expect(parsed?.getDate()).toBe(5);
    expect(serviceDateInputValue(parsed)).toBe('2024-03-05');
  });

  it('rejects empty, malformed and overflowing dates', () => {
    expect(parseServiceDateInput('')).toBeNull();
    expect(parseServiceDateInput('03/05/2024')).toBeNull();
    expect(parseServiceDateInput('2024-02-31')).toBeNull();
    expect(serviceDateInputValue(null)).toBe('');
    expect(serviceDateInputValue(new Date('nope'))).toBe('');
  });

  it('compares by calendar day, ignoring the time', () => {
    expect(isSameServiceDay(new Date(2024, 2, 5, 1), new Date(2024, 2, 5, 23))).toBe(true);
    expect(isSameServiceDay(new Date(2024, 2, 5), new Date(2024, 2, 6))).toBe(false);
    expect(isSameServiceDay(null, null)).toBe(false);
  });
});
