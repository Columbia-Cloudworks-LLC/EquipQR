import { describe, expect, it } from 'vitest';
import { FeatureFlags, QUICKBOOKS_ENABLED, isQuickBooksEnabled } from './flags';

describe('flags', () => {
  it('should have FeatureFlags.quickbooks.enabled matching QUICKBOOKS_ENABLED', () => {
    expect(FeatureFlags.quickbooks.enabled).toBe(QUICKBOOKS_ENABLED);
  });

  it('should have isQuickBooksEnabled return QUICKBOOKS_ENABLED', () => {
    expect(isQuickBooksEnabled()).toBe(QUICKBOOKS_ENABLED);
  });

});
