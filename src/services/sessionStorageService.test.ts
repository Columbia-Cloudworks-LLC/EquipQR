import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SessionData } from '@/types/session';
import { getSessionStorageKey, getSessionVersion } from '@/utils/sessionPersistence';

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { logger } from '@/utils/logger';
import { SessionStorageService } from './sessionStorageService';

const STORAGE_KEY = getSessionStorageKey();
const SESSION_VERSION = getSessionVersion();

const buildSession = (overrides: Partial<SessionData> = {}): SessionData => ({
  organizations: [
    {
      id: 'org-1',
      name: 'Org',
      plan: 'free',
      memberCount: 1,
      maxMembers: 5,
      features: [],
      scanLocationCollectionEnabled: true,
      userRole: 'member',
      userStatus: 'active',
    },
  ],
  currentOrganizationId: 'org-1',
  teamMemberships: [],
  lastUpdated: new Date().toISOString(),
  version: SESSION_VERSION,
  ...overrides,
});

describe('SessionStorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('equipqr:cookie-consent', 'accepted');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('loadSessionFromStorage', () => {
    it('returns null when nothing is stored', () => {
      expect(SessionStorageService.loadSessionFromStorage()).toBeNull();
    });

    it('returns parsed session when version matches and data is fresh', () => {
      const session = buildSession();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, authUserId: 'user-1' }));

      expect(SessionStorageService.loadSessionFromStorage('user-1')).toEqual(session);
    });

    it('returns stale session without clearing when older than four hours', () => {
      const stale = buildSession({
        lastUpdated: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stale, authUserId: 'user-1' }));

      expect(SessionStorageService.loadSessionFromStorage('user-1')).toEqual(stale);
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
      expect(logger.info).toHaveBeenCalledWith(
        '⏰ Session data is older than 4 hours, will refresh on next fetch'
      );
    });

    it('clears storage and returns null on version mismatch', () => {
      const outdated = { ...buildSession({ version: SESSION_VERSION - 1 }), authUserId: 'user-1' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(outdated));

      expect(SessionStorageService.loadSessionFromStorage('user-1')).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('🔄 Session version updated, clearing stored data');
    });

    it('clears storage and returns null when the cached user does not match', () => {
      const session = buildSession();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, authUserId: 'user-tech' }));
      localStorage.setItem('equipqr_current_org', JSON.stringify({ selectedOrgId: 'org-1' }));
      localStorage.setItem('equipqr_current_organization', 'org-1');
      localStorage.setItem('equipqr:selectedTeamId:org-1', 'team-1');

      expect(SessionStorageService.loadSessionFromStorage('user-viewer')).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem('equipqr_current_org')).toBeNull();
      expect(localStorage.getItem('equipqr_current_organization')).toBeNull();
      expect(localStorage.getItem('equipqr:selectedTeamId:org-1')).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('🔄 Session user changed, clearing stored data');
    });

    it('clears storage and returns null on invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'not-json');

      expect(SessionStorageService.loadSessionFromStorage()).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        '💥 Error loading session from storage:',
        expect.any(Error)
      );
    });
  });

  describe('saveSessionToStorage', () => {
    it('persists session JSON without inventory location fields', () => {
      const session = buildSession({
        organizations: [
          {
            ...buildSession().organizations[0]!,
            inventoryDefaultLocationName: 'Main Yard',
            inventoryDefaultLocationAddress: '123 Main St',
            inventoryDefaultLocationCity: 'Springfield',
            inventoryDefaultLocationLat: 41.5,
            inventoryDefaultLocationLng: -87.5,
          },
        ],
      });

      SessionStorageService.saveSessionToStorage(session, 'user-1');

      const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as typeof session;
      expect(persisted.currentOrganizationId).toBe(session.currentOrganizationId);
      expect(persisted.organizations[0]?.id).toBe('org-1');
      expect(persisted.organizations[0]?.inventoryDefaultLocationName).toBe('Main Yard');
      expect(persisted.organizations[0]).not.toHaveProperty('inventoryDefaultLocationAddress');
      expect(persisted.organizations[0]).not.toHaveProperty('inventoryDefaultLocationLat');
      expect((persisted as typeof persisted & { authUserId?: string }).authUserId).toBe('user-1');
    });

    it('logs when localStorage setItem fails', () => {
      const session = buildSession();
      // Cover both prototype-bound (jsdom) and own-method (setup.ts memory Storage) paths.
      const throwQuota = () => {
        throw new Error('quota');
      };
      const protoSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwQuota);
      const instanceSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(throwQuota);

      try {
        SessionStorageService.saveSessionToStorage(session, 'user-1');

        expect(logger.error).toHaveBeenCalledWith(
          '💾 Error saving session to storage:',
          expect.any(Error)
        );
      } finally {
        protoSpy.mockRestore();
        instanceSpy.mockRestore();
      }
    });
  });

  describe('clearSessionStorage', () => {
    it('removes session and organization/team scope keys', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildSession()));
      localStorage.setItem('equipqr_current_org', JSON.stringify({ selectedOrgId: 'org-1' }));
      localStorage.setItem('equipqr_current_organization', 'org-1');
      localStorage.setItem('equipqr:selectedTeamId:org-1', 'team-1');
      localStorage.setItem('equipqr:selectedTeamId:org-2', 'team-2');

      SessionStorageService.clearSessionStorage();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem('equipqr_current_org')).toBeNull();
      expect(localStorage.getItem('equipqr_current_organization')).toBeNull();
      expect(localStorage.getItem('equipqr:selectedTeamId:org-1')).toBeNull();
      expect(localStorage.getItem('equipqr:selectedTeamId:org-2')).toBeNull();
    });
  });

  describe('isSessionVersionValid', () => {
    it('returns true only for current session version', () => {
      expect(SessionStorageService.isSessionVersionValid(buildSession())).toBe(true);
      expect(
        SessionStorageService.isSessionVersionValid(buildSession({ version: SESSION_VERSION - 1 }))
      ).toBe(false);
    });
  });
});
