import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildEmptySessionData,
  resolvePrioritizedOrgId,
  shouldSkipSessionRefresh,
} from './sessionManagerRefresh';

vi.mock('@/utils/sessionPersistence', () => ({
  getSessionVersion: vi.fn(() => 2),
}));

describe('sessionManagerRefresh helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('buildEmptySessionData', () => {
    it('returns an empty session with current version', () => {
      expect(buildEmptySessionData()).toEqual({
        organizations: [],
        currentOrganizationId: null,
        teamMemberships: [],
        lastUpdated: '2024-06-01T12:00:00.000Z',
        version: 2,
      });
    });
  });

  describe('shouldSkipSessionRefresh', () => {
    it('returns false when forced or no prior refresh timestamp', () => {
      expect(shouldSkipSessionRefresh(true, '2024-06-01T11:00:00.000Z')).toBe(false);
      expect(shouldSkipSessionRefresh(false, null)).toBe(false);
    });

    it('returns true when last refresh was within five minutes', () => {
      expect(shouldSkipSessionRefresh(false, '2024-06-01T11:56:00.000Z')).toBe(true);
    });

    it('returns false when last refresh is older than five minutes', () => {
      expect(shouldSkipSessionRefresh(false, '2024-06-01T11:54:00.000Z')).toBe(false);
    });
  });

  describe('resolvePrioritizedOrgId', () => {
    it('prefers cached org when preserveOrgSelection is enabled', () => {
      expect(resolvePrioritizedOrgId(true, 'org-cached', 'org-pref')).toBe('org-cached');
    });

    it('uses preference when preserveOrgSelection is disabled', () => {
      expect(resolvePrioritizedOrgId(false, 'org-cached', 'org-pref')).toBe('org-pref');
    });
  });
});
