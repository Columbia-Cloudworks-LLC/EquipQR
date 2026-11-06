import { describe, expect, it } from 'vitest';
import { buildRunTimePattern, replaceRunTimestamps, RUN_TIME_PLACEHOLDER } from '../../e2e/screen-catalog/run-time-mask';

// 2026-11-06 14:15 UTC is 8:15 AM in America/Chicago.
const start = new Date('2026-11-06T14:15:00Z');
const end = new Date('2026-11-06T14:24:00Z');
const pattern = buildRunTimePattern(start, end, 'America/Chicago');
const mask = (text: string) => replaceRunTimestamps(text, pattern);

describe('run-time timestamp mask', () => {
  it('masks the run date in common formats, including a trailing time', () => {
    expect(mask('Created: 11/6/2026, 8:15:18 AM • Sections: 12')).toBe(`Created: ${RUN_TIME_PLACEHOLDER} • Sections: 12`);
    expect(mask('saved at Nov 6, 2026, 4:15 PM.')).toBe(`saved at ${RUN_TIME_PLACEHOLDER}.`);
    expect(mask('on 2026-11-06')).toBe(`on ${RUN_TIME_PLACEHOLDER}`);
    expect(mask('November 6, 2026')).toBe(RUN_TIME_PLACEHOLDER);
  });

  it('masks a bare time of day inside the run window only', () => {
    expect(mask('8:15 AM')).toBe(RUN_TIME_PLACEHOLDER);
    expect(mask('8:23 AM')).toBe(RUN_TIME_PLACEHOLDER);
    expect(mask('9:40 AM')).toBe('9:40 AM');
    expect(mask('8:15 PM')).toBe('8:15 PM');
  });

  it('leaves seeded dates and other numbers alone', () => {
    expect(mask('Due: 1/10/2026')).toBe('Due: 1/10/2026');
    expect(mask('11/16/2026')).toBe('11/16/2026');
    expect(mask('Total items: 103 · 1,542.5 hrs')).toBe('Total items: 103 · 1,542.5 hrs');
    expect(mask('Nov 6')).toBe('Nov 6');
  });
});
