import { describe, expect, it } from 'vitest';
import { pickUtmParams, sanitizeAnalyticsPath } from './googleAnalytics';

describe('sanitizeAnalyticsPath', () => {
  it.each([
    ['/', '/'],
    ['/features/work-order-management', '/features/work-order-management'],
    ['/dashboard/work-orders/0f8fad5b-d9cb-469f-a165-70867728950e', '/dashboard/work-orders/:id'],
    ['/qr/equipment/0f8fad5b-d9cb-469f-a165-70867728950e', '/qr/equipment/:id'],
    ['/invitation/short', '/invitation/:token'],
    ['/qr/quick-form/abc', '/qr/quick-form/:token'],
    ['/qr/operator-check-in/abc/extra', '/qr/operator-check-in/:token'],
    ['/dsr/a1b2c3d4e5f6a7b8c9d0e1f2', '/dsr/:token'],
  ])('%s → %s', (input, expected) => {
    expect(sanitizeAnalyticsPath(input)).toBe(expected);
  });
});

describe('pickUtmParams', () => {
  it('keeps only UTM tags in a stable order', () => {
    expect(pickUtmParams('?gclid=1&utm_medium=gbp&token=secret&utm_source=google')).toBe(
      'utm_source=google&utm_medium=gbp',
    );
  });

  it('returns an empty string when no UTM tags are present', () => {
    expect(pickUtmParams('?tab=notes')).toBe('');
  });
});
