import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionStorageService } from '@/services/sessionStorageService';
import type { SessionData, SessionOrganization, SessionTeamMembership } from '@/contexts/SessionContext';

// Suppress logger output — logger.ts is excluded from coverage and would
// produce noisy console lines during tests otherwise.
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// These constants mirror the values in src/utils/sessionPersistence.ts so
// tests can set up localStorage state without importing internal utilities.
const SESSION_KEY = 'equipqr_session_data';
const SESSION_VERSION = 2;
const ORG_PREF_KEY = 'equipqr_current_org';

function makeSessionData(overrides: Partial<SessionData> = {}): SessionData {
  return {
    organizations: [],
    currentOrganizationId: null,
    teamMemberships: [],
    lastUpdated: new Date().toISOString(),
    version: SESSION_VERSION,
    ...overrides,
  };
}

function makeOrganization(overrides: Partial<SessionOrganization> = {}): SessionOrganization {
  return {
    id: 'org-1',
    name: 'Acme Corp',
    plan: 'free',
    memberCount: 5,
    maxMembers: 10,
    features: [],
    scanLocationCollectionEnabled: false,
    userRole: 'admin',
    userStatus: 'active',
    ...overrides,
  };
}

function makeTeamMembership(overrides: Partial<SessionTeamMembership> = {}): SessionTeamMembership {
  return {
    teamId: 'team-1',
    teamName: 'Alpha Team',
    role: 'technician',
    joinedDate: new Date().toISOString(),
    ...overrides,
  };
}

describe('SessionStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // loadSessionFromStorage
  // ---------------------------------------------------------------------------
  describe('loadSessionFromStorage', () => {
    it('returns null when localStorage has no session entry', () => {
      const result = SessionStorageService.loadSessionFromStorage();
      expect(result).toBeNull();
    });

    it('returns null and removes the key when the stored version does not match', () => {
      const staleSession = makeSessionData({ version: 999 });
      localStorage.setItem(SESSION_KEY, JSON.stringify(staleSession));

      const result = SessionStorageService.loadSessionFromStorage();

      expect(result).toBeNull();
      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('returns session data when version matches and session is recent', () => {
      const session = makeSessionData();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      const result = SessionStorageService.loadSessionFromStorage();

      expect(result).not.toBeNull();
      expect(result?.version).toBe(SESSION_VERSION);
      expect(result?.currentOrganizationId).toBeNull();
    });

    it('returns session data (without clearing) when session is older than 4 hours', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
      const oldSession = makeSessionData({ lastUpdated: fiveHoursAgo });
      localStorage.setItem(SESSION_KEY, JSON.stringify(oldSession));

      const result = SessionStorageService.loadSessionFromStorage();

      // Older sessions are returned (marked for refresh) — NOT cleared.
      expect(result).not.toBeNull();
      expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();
    });

    it('returns null and removes the key when JSON is malformed', () => {
      localStorage.setItem(SESSION_KEY, '{ broken json :::');

      const result = SessionStorageService.loadSessionFromStorage();

      expect(result).toBeNull();
      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('returns null and removes the key when stored value is not a JSON object', () => {
      localStorage.setItem(SESSION_KEY, '"just a string"');

      // parsed is a string, parsed.version will be undefined → version mismatch → null
      const result = SessionStorageService.loadSessionFromStorage();

      expect(result).toBeNull();
    });

    it('preserves organizations in the returned session', () => {
      const session = makeSessionData({
        organizations: [makeOrganization({ id: 'org-42', name: 'Globex Corp' })],
        currentOrganizationId: 'org-42',
      });
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      const result = SessionStorageService.loadSessionFromStorage();

      expect(result?.organizations).toHaveLength(1);
      expect(result?.organizations[0].name).toBe('Globex Corp');
      expect(result?.currentOrganizationId).toBe('org-42');
    });

    it('preserves team memberships in the returned session', () => {
      const session = makeSessionData({
        teamMemberships: [
          makeTeamMembership({ teamId: 'team-99', teamName: 'Beta Squad', role: 'manager' }),
        ],
      });
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      const result = SessionStorageService.loadSessionFromStorage();

      expect(result?.teamMemberships).toHaveLength(1);
      expect(result?.teamMemberships[0].role).toBe('manager');
    });
  });

  // ---------------------------------------------------------------------------
  // saveSessionToStorage
  // ---------------------------------------------------------------------------
  describe('saveSessionToStorage', () => {
    it('writes serialized session data to localStorage under the expected key', () => {
      const session = makeSessionData();

      SessionStorageService.saveSessionToStorage(session);

      const raw = localStorage.getItem(SESSION_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.version).toBe(SESSION_VERSION);
    });

    it('overwrites a previously saved session', () => {
      const first = makeSessionData({ currentOrganizationId: 'org-1' });
      const second = makeSessionData({ currentOrganizationId: 'org-2' });

      SessionStorageService.saveSessionToStorage(first);
      SessionStorageService.saveSessionToStorage(second);

      const raw = localStorage.getItem(SESSION_KEY);
      const parsed = JSON.parse(raw!);
      expect(parsed.currentOrganizationId).toBe('org-2');
    });

    it('serializes and round-trips team memberships correctly', () => {
      const session = makeSessionData({
        teamMemberships: [makeTeamMembership({ teamId: 'tm-7', teamName: 'Field Crew' })],
      });

      SessionStorageService.saveSessionToStorage(session);

      const raw = localStorage.getItem(SESSION_KEY)!;
      const parsed = JSON.parse(raw);
      expect(parsed.teamMemberships[0].teamId).toBe('tm-7');
    });

    it('serializes and round-trips organizations correctly', () => {
      const org = makeOrganization({ userRole: 'owner', plan: 'premium' });
      const session = makeSessionData({ organizations: [org] });

      SessionStorageService.saveSessionToStorage(session);

      const raw = localStorage.getItem(SESSION_KEY)!;
      const parsed = JSON.parse(raw);
      expect(parsed.organizations[0].userRole).toBe('owner');
      expect(parsed.organizations[0].plan).toBe('premium');
    });
  });

  // ---------------------------------------------------------------------------
  // clearSessionStorage
  // ---------------------------------------------------------------------------
  describe('clearSessionStorage', () => {
    it('removes the session key from localStorage', () => {
      const session = makeSessionData();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      SessionStorageService.clearSessionStorage();

      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('also removes the organization preference key', () => {
      localStorage.setItem(
        ORG_PREF_KEY,
        JSON.stringify({ selectedOrgId: 'org-1', selectionTimestamp: new Date().toISOString() })
      );

      SessionStorageService.clearSessionStorage();

      expect(localStorage.getItem(ORG_PREF_KEY)).toBeNull();
    });

    it('is idempotent — does not throw when nothing is stored', () => {
      expect(() => SessionStorageService.clearSessionStorage()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // isSessionExpired
  // ---------------------------------------------------------------------------
  describe('isSessionExpired', () => {
    it('returns true when lastUpdated is more than 4 hours ago', () => {
      const session = makeSessionData({
        lastUpdated: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      });

      expect(SessionStorageService.isSessionExpired(session)).toBe(true);
    });

    it('returns false when lastUpdated is within the last hour', () => {
      const session = makeSessionData({
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      });

      expect(SessionStorageService.isSessionExpired(session)).toBe(false);
    });

    it('returns false when lastUpdated is just now', () => {
      const session = makeSessionData({ lastUpdated: new Date().toISOString() });

      expect(SessionStorageService.isSessionExpired(session)).toBe(false);
    });

    it('returns true when lastUpdated is exactly at 4 hours plus 1 ms', () => {
      const session = makeSessionData({
        lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000 - 1).toISOString(),
      });

      expect(SessionStorageService.isSessionExpired(session)).toBe(true);
    });

    it('returns false when lastUpdated is exactly 3 hours 59 minutes ago', () => {
      const session = makeSessionData({
        lastUpdated: new Date(Date.now() - (4 * 60 * 60 * 1000 - 60 * 1000)).toISOString(),
      });

      expect(SessionStorageService.isSessionExpired(session)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // isSessionVersionValid
  // ---------------------------------------------------------------------------
  describe('isSessionVersionValid', () => {
    it('returns true when the session version matches the current SESSION_VERSION', () => {
      const session = makeSessionData({ version: SESSION_VERSION });

      expect(SessionStorageService.isSessionVersionValid(session)).toBe(true);
    });

    it('returns false when the version is 0', () => {
      const session = makeSessionData({ version: 0 });

      expect(SessionStorageService.isSessionVersionValid(session)).toBe(false);
    });

    it('returns false when the version is 1 (legacy)', () => {
      const session = makeSessionData({ version: 1 });

      expect(SessionStorageService.isSessionVersionValid(session)).toBe(false);
    });

    it('returns false when the version is a large arbitrary number', () => {
      const session = makeSessionData({ version: 9999 });

      expect(SessionStorageService.isSessionVersionValid(session)).toBe(false);
    });
  });
});
