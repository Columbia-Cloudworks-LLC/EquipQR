import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStarterCatalogExpandedPreference,
  setStarterCatalogExpandedPreference,
} from '@/features/operator-check-ins/utils/operatorChecklistCatalogPreferences';

describe('operatorChecklistCatalogPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no preference is stored', () => {
    expect(getStarterCatalogExpandedPreference('org-1')).toBeNull();
  });

  it('returns stored boolean after set', () => {
    setStarterCatalogExpandedPreference('org-1', true);
    expect(getStarterCatalogExpandedPreference('org-1')).toBe(true);

    setStarterCatalogExpandedPreference('org-1', false);
    expect(getStarterCatalogExpandedPreference('org-1')).toBe(false);
  });

  it('isolates preferences per organization id', () => {
    setStarterCatalogExpandedPreference('org-1', true);
    setStarterCatalogExpandedPreference('org-2', false);

    expect(getStarterCatalogExpandedPreference('org-1')).toBe(true);
    expect(getStarterCatalogExpandedPreference('org-2')).toBe(false);
  });
});
