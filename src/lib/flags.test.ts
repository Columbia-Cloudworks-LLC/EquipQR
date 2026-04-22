import { describe, expect, it } from 'vitest';
import { FeatureFlags, QUICKBOOKS_ENABLED, isQuickBooksDisabled, isQuickBooksEnabled } from './flags';

describe('flags', () => {
  it('should have FeatureFlags.quickbooks.enabled matching QUICKBOOKS_ENABLED', () => {
    expect(FeatureFlags.quickbooks.enabled).toBe(QUICKBOOKS_ENABLED);
    expect(FeatureFlags.quickbooks.disabled).toBe(!QUICKBOOKS_ENABLED);
  });

  it('should have isQuickBooksEnabled return QUICKBOOKS_ENABLED', () => {
    expect(isQuickBooksEnabled()).toBe(QUICKBOOKS_ENABLED);
  });

  it('should have isQuickBooksDisabled return opposite of QUICKBOOKS_ENABLED', () => {
    expect(isQuickBooksDisabled()).toBe(!QUICKBOOKS_ENABLED);
  });
});
