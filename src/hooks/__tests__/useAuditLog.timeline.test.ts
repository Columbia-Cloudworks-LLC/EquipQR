import { describe, it, expect } from 'vitest';
import { auditQueryKeys, deriveTimelineBucket } from '@/hooks/useAuditLog';

describe('deriveTimelineBucket', () => {
  it("picks 'minute' for ranges under one hour", () => {
    const from = '2026-04-20T10:00:00.000Z';
    const to = '2026-04-20T10:30:00.000Z';
    expect(deriveTimelineBucket(from, to)).toBe('minute');
  });

  it("picks 'minute' at the one-hour boundary (inclusive)", () => {
    const from = new Date('2026-04-20T10:00:00.000Z');
    const to = new Date('2026-04-20T11:00:00.000Z');
    expect(deriveTimelineBucket(from, to)).toBe('minute');
  });

  it("picks 'hour' for ranges between one hour and one day", () => {
    expect(
      deriveTimelineBucket('2026-04-20T10:00:00.000Z', '2026-04-20T23:00:00.000Z')
    ).toBe('hour');
    expect(
      deriveTimelineBucket('2026-04-19T10:00:00.000Z', '2026-04-20T10:00:00.000Z')
    ).toBe('hour');
  });

  it("picks 'day' for ranges longer than one day", () => {
    expect(
      deriveTimelineBucket('2026-04-13T00:00:00.000Z', '2026-04-20T00:00:00.000Z')
    ).toBe('day');
    expect(
      deriveTimelineBucket('2026-03-21T00:00:00.000Z', '2026-04-20T00:00:00.000Z')
    ).toBe('day');
  });

  it('treats negative or zero spans as the smallest bucket', () => {
    const ts = '2026-04-20T10:00:00.000Z';
    expect(deriveTimelineBucket(ts, ts)).toBe('minute');
    expect(deriveTimelineBucket('2026-04-20T11:00:00.000Z', '2026-04-20T10:00:00.000Z')).toBe(
      'minute'
    );
  });

  it('accepts both string and Date inputs', () => {
    expect(
      deriveTimelineBucket(
        new Date('2026-04-13T00:00:00.000Z'),
        new Date('2026-04-20T00:00:00.000Z')
      )
    ).toBe('day');
  });
});

describe('auditQueryKeys.timeline', () => {
  it('includes the org id and the full params object so distinct queries cache separately', () => {
    const a = auditQueryKeys.timeline('org-1', {
      bucket: 'hour',
      dateFrom: '2026-04-20T00:00:00.000Z',
      dateTo: '2026-04-21T00:00:00.000Z',
    });
    const b = auditQueryKeys.timeline('org-1', {
      bucket: 'hour',
      dateFrom: '2026-04-20T00:00:00.000Z',
      dateTo: '2026-04-21T00:00:00.000Z',
    });
    const c = auditQueryKeys.timeline('org-2', {
      bucket: 'hour',
      dateFrom: '2026-04-20T00:00:00.000Z',
      dateTo: '2026-04-21T00:00:00.000Z',
    });
    const d = auditQueryKeys.timeline('org-1', {
      bucket: 'day',
      dateFrom: '2026-04-20T00:00:00.000Z',
      dateTo: '2026-04-21T00:00:00.000Z',
    });

    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a).not.toEqual(d);
    expect(a[0]).toBe('audit-log');
    expect(a[1]).toBe('timeline');
    expect(a[2]).toBe('org-1');
  });

  it('captures filters in the key so changing filters busts the cache', () => {
    const base = {
      bucket: 'hour' as const,
      dateFrom: '2026-04-20T00:00:00.000Z',
      dateTo: '2026-04-21T00:00:00.000Z',
    };
    const withoutFilters = auditQueryKeys.timeline('org-1', base);
    const withAction = auditQueryKeys.timeline('org-1', {
      ...base,
      filters: { action: 'INSERT' },
    });

    expect(withoutFilters).not.toEqual(withAction);
  });
});
