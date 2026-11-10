import { describe, expect, it } from 'vitest';
import { buildServiceSummaryText, formatDaysAgo } from './serviceSummary';

describe('serviceSummary', () => {
  const now = new Date(2026, 10, 10, 9, 0);

  it('describes how long ago the PM was in whole calendar days', () => {
    expect(formatDaysAgo(new Date(2026, 10, 10, 1, 0), now)).toBe('today');
    expect(formatDaysAgo(new Date(2026, 10, 9, 23, 0), now)).toBe('yesterday');
    expect(formatDaysAgo(new Date(2026, 9, 29, 12, 0), now)).toBe('12 days ago');
  });

  it('never reports a negative age for a future-dated record', () => {
    expect(formatDaysAgo(new Date(2026, 10, 12), now)).toBe('today');
  });

  it('builds the badge text with hours when a reading was recorded', () => {
    expect(buildServiceSummaryText(new Date(2026, 9, 29, 12).toISOString(), 1240, now)).toBe(
      'Last PM: 12 days ago • 1,240 hrs',
    );
  });

  it('omits hours when no reading was recorded', () => {
    expect(buildServiceSummaryText(new Date(2026, 9, 29, 12).toISOString(), null, now)).toBe(
      'Last PM: 12 days ago',
    );
  });

  it('returns null for an unreadable date', () => {
    expect(buildServiceSummaryText('not-a-date', 10, now)).toBeNull();
  });
});
