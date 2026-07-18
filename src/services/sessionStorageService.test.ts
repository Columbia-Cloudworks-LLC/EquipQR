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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

      expect(SessionStorageService.loadSessionFromStorage()).toEqual(session);
    });

    it('returns stale session without clearing when older than four hours', () => {
      const stale = buildSession({
        lastUpdated: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stale));

      expect(SessionStorageService.loadSessionFromStorage()).toEqual(stale);
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
      expect(logger.info).toHaveBeenCalledWith(
        '⏰ Session data is older than 4 hours, will refresh on next fetch'
      );
    });

    it('clears storage and returns null on version mismatch', () => {
      const outdated = buildSession({ version: SESSION_VERSION - 1 });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(outdated));

      expect(SessionStorageService.loadSessionFromStorage()).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('🔄 Session version updated, clearing stored data');
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
    it('persists session JSON', () => {
      const session = buildSession();

      SessionStorageService.saveSessionToStorage(session);

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(session);
    });

    it('logs when localStorage setItem fails', () => {
      const session = buildSession();
      // Cover both prototype-bound (jsdom) and own-method (setup.ts memory Storage) paths.
      const throwQuota = () => {
        throw new Error('quota');
      };
      const protoSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwQuota);
      const instanceSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(throwQuota);

      SessionStorageService.saveSessionToStorage(session);

      expect(logger.error).toHaveBeenCalledWith(
        '💾 Error saving session to storage:',
        expect.any(Error)
      );

      protoSpy.mockRestore();
      instanceSpy.mockRestore();
    });
  });

  describe('clearSessionStorage', () => {
    it('removes session and organization preference keys', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildSession()));
      localStorage.setItem('equipqr_current_org', JSON.stringify({ selectedOrgId: 'org-1' }));

      SessionStorageService.clearSessionStorage();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem('equipqr_current_org')).toBeNull();
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
