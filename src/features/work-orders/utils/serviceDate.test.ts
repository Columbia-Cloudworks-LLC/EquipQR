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

  it('pins today to local noon so the calendar day survives a UTC conversion', () => {
    const today = todayServiceDate(now);

    expect(today.getHours()).toBe(12);
    expect(serviceDateInputValue(today)).toBe('2026-11-10');
    // Noon local is the same calendar day in every UTC offset from -11 to +11.
    expect(today.toISOString().slice(0, 10)).toMatch(/^2026-11-1[01]$/);
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
