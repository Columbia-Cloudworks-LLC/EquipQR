import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import type { SessionData, SessionOrganization } from '@/types/session';

vi.mock('@/services/sessionDataService', () => ({
  SessionDataService: {
    fetchSessionData: vi.fn(),
    fetchTeamMemberships: vi.fn(),
  },
}));

vi.mock('@/services/sessionStorageService', () => ({
  SessionStorageService: {
    loadSessionFromStorage: vi.fn(),
    saveSessionToStorage: vi.fn(),
    clearSessionStorage: vi.fn(),
    isSessionVersionValid: vi.fn(),
  },
}));

vi.mock('@/utils/sessionPersistence', () => ({
  getOrganizationPreference: vi.fn(),
  saveOrganizationPreference: vi.fn(),
  shouldRefreshSession: vi.fn(),
  getSessionVersion: vi.fn(() => 2),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { SessionDataService } from '@/services/sessionDataService';
import { SessionStorageService } from '@/services/sessionStorageService';
import {
  getOrganizationPreference,
  saveOrganizationPreference,
  shouldRefreshSession,
} from '@/utils/sessionPersistence';
import { logger } from '@/utils/logger';
import { useSessionManager } from './useSessionManager';

const mockUser = { id: 'user-1', email: 'test@example.com' } as User;

const mockOrganization: SessionOrganization = {
  id: 'org-1',
  name: 'Org One',
  plan: 'premium',
  memberCount: 2,
  maxMembers: 10,
  features: [],
  scanLocationCollectionEnabled: true,
  userRole: 'admin',
  userStatus: 'active',
};

const mockOrganizationTwo: SessionOrganization = {
  ...mockOrganization,
  id: 'org-2',
  name: 'Org Two',
};

const mockSessionData: SessionData = {
  organizations: [mockOrganization, mockOrganizationTwo],
  currentOrganizationId: 'org-1',
  teamMemberships: [
    {
      teamId: 'team-1',
      teamName: 'Team 1',
      role: 'manager',
      joinedDate: '2024-01-01',
    },
  ],
  lastUpdated: new Date().toISOString(),
  version: 2,
};

const mockFetchSessionSuccess = () => {
  vi.mocked(SessionDataService.fetchSessionData).mockResolvedValue({
    organizations: [mockOrganization],
    currentOrganizationId: 'org-1',
    teamMemberships: [],
  });
};

const forceRefresh = async (result: { current: ReturnType<typeof useSessionManager> }) => {
  await act(async () => {
    await result.current.refreshSession(true);
  });
};

const createHook = (overrides?: Partial<Parameters<typeof useSessionManager>[0]>) => {
  const onSessionUpdate = vi.fn();
  const onError = vi.fn();

  const hook = renderHook(() =>
    useSessionManager({
      user: mockUser,
      authLoading: false,
      onSessionUpdate,
      onError,
      ...overrides,
    })
  );

  return { ...hook, onSessionUpdate, onError };
};

describe('useSessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(SessionStorageService.isSessionVersionValid).mockReturnValue(true);
    vi.mocked(shouldRefreshSession).mockReturnValue(false);
    vi.mocked(getOrganizationPreference).mockReturnValue(null);
    vi.mocked(SessionStorageService.loadSessionFromStorage).mockReturnValue(null);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeSession', () => {
    it('returns waitForAuth when auth is loading and user is absent', () => {
      const { result } = createHook({ user: null, authLoading: true });

      expect(result.current.initializeSession()).toEqual({ waitForAuth: true });
      expect(SessionStorageService.clearSessionStorage).not.toHaveBeenCalled();
    });

    it('clears storage when unauthenticated and auth is resolved', () => {
      const { result } = createHook({ user: null, authLoading: false });

      expect(result.current.initializeSession()).toEqual({
        shouldLoadFromCache: false,
        cachedData: null,
      });
      expect(SessionStorageService.clearSessionStorage).toHaveBeenCalled();
    });

    it('loads valid cache and marks refresh when session is stale', () => {
      vi.mocked(SessionStorageService.loadSessionFromStorage).mockReturnValue(mockSessionData);
      vi.mocked(shouldRefreshSession).mockReturnValue(true);

      const { result } = createHook();

      expect(result.current.initializeSession()).toEqual({
        shouldLoadFromCache: true,
        cachedData: mockSessionData,
        needsRefresh: true,
      });
    });

    it('loads valid cache without refresh when session is fresh', () => {
      vi.mocked(SessionStorageService.loadSessionFromStorage).mockReturnValue(mockSessionData);
      vi.mocked(shouldRefreshSession).mockReturnValue(false);

      const { result } = createHook();

      expect(result.current.initializeSession()).toEqual({
        shouldLoadFromCache: true,
        cachedData: mockSessionData,
        needsRefresh: false,
      });
    });

    it('returns empty cache when stored session is missing or invalid version', () => {
      vi.mocked(SessionStorageService.loadSessionFromStorage).mockReturnValue(mockSessionData);
      vi.mocked(SessionStorageService.isSessionVersionValid).mockReturnValue(false);

      const { result } = createHook();

      expect(result.current.initializeSession()).toEqual({
        shouldLoadFromCache: false,
        cachedData: null,
      });
    });
  });

  describe('switchOrganization', () => {
    it('no-ops when session data or user is missing', async () => {
      const { result, onSessionUpdate } = createHook({ user: null });

      await act(async () => {
        await result.current.switchOrganization('org-2', mockSessionData);
      });

      expect(onSessionUpdate).not.toHaveBeenCalled();
      expect(saveOrganizationPreference).not.toHaveBeenCalled();
    });

    it('throws when organization is not in session data', async () => {
      const { result } = createHook();

      await expect(
        act(async () => {
          await result.current.switchOrganization('missing-org', mockSessionData);
        })
      ).rejects.toThrow("Organization missing-org not found in user's organizations");

      expect(logger.warn).toHaveBeenCalledWith(
        'Organization not found during session switch',
        { organizationId: 'missing-org' }
      );
    });

    it('saves preference and updates session on success', async () => {
      const newTeams = [
        {
          teamId: 'team-2',
          teamName: 'Team 2',
          role: 'technician' as const,
          joinedDate: '2024-02-01',
        },
      ];
      vi.mocked(SessionDataService.fetchTeamMemberships).mockResolvedValue(newTeams);

      const { result, onSessionUpdate } = createHook();

      await act(async () => {
        await result.current.switchOrganization('org-2', mockSessionData);
      });

      expect(saveOrganizationPreference).toHaveBeenCalledWith('org-2');
      expect(SessionDataService.fetchTeamMemberships).toHaveBeenCalledWith('user-1', 'org-2');
      expect(onSessionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          organizations: mockSessionData.organizations,
          currentOrganizationId: 'org-2',
          teamMemberships: newTeams,
          version: 2,
        })
      );
      expect(SessionStorageService.saveSessionToStorage).toHaveBeenCalled();
    });

    it('logs error when team membership fetch fails without throwing', async () => {
      vi.mocked(SessionDataService.fetchTeamMemberships).mockRejectedValue(new Error('network'));

      const { result, onSessionUpdate } = createHook();

      await act(async () => {
        await result.current.switchOrganization('org-2', mockSessionData);
      });

      expect(logger.error).toHaveBeenCalledWith('Error switching organization', expect.any(Error));
      expect(onSessionUpdate).not.toHaveBeenCalled();
    });
  });

  describe('refreshSession', () => {
    it('clears session shape when user is absent', async () => {
      const { result, onSessionUpdate } = createHook({ user: null });

      await act(async () => {
        await result.current.refreshSession();
      });

      expect(onSessionUpdate).toHaveBeenCalledWith({
        organizations: [],
        currentOrganizationId: null,
        teamMemberships: [],
        lastUpdated: expect.any(String),
        version: 2,
      });
      expect(SessionDataService.fetchSessionData).not.toHaveBeenCalled();
    });

    it('skips refresh when last refresh was within five minutes unless forced', async () => {
      mockFetchSessionSuccess();
      const { result } = createHook();

      await forceRefresh(result);

      expect(SessionDataService.fetchSessionData).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refreshSession(false);
      });

      expect(SessionDataService.fetchSessionData).toHaveBeenCalledTimes(1);

      await forceRefresh(result);

      expect(SessionDataService.fetchSessionData).toHaveBeenCalledTimes(2);
    });

    it('prioritizes cached org when preserveOrgSelection is true', async () => {
      vi.mocked(getOrganizationPreference).mockReturnValue({
        selectedOrgId: 'org-pref',
        selectionTimestamp: new Date().toISOString(),
      });
      vi.mocked(SessionStorageService.loadSessionFromStorage).mockReturnValue({
        ...mockSessionData,
        currentOrganizationId: 'org-cached',
      });
      vi.mocked(SessionDataService.fetchSessionData).mockResolvedValue({
        organizations: [mockOrganization],
        currentOrganizationId: 'org-1',
        teamMemberships: [],
      });

      const { result } = createHook();

      await act(async () => {
        await result.current.refreshSession(true, true);
      });

      expect(SessionDataService.fetchSessionData).toHaveBeenCalledWith(
        'user-1',
        'org-cached',
        'org-cached'
      );
    });

    it('fetches session data and persists on success', async () => {
      vi.mocked(getOrganizationPreference).mockReturnValue({
        selectedOrgId: 'org-1',
        selectionTimestamp: new Date().toISOString(),
      });
      vi.mocked(SessionDataService.fetchSessionData).mockResolvedValue({
        organizations: [mockOrganization],
        currentOrganizationId: 'org-1',
        teamMemberships: mockSessionData.teamMemberships,
      });

      const { result, onSessionUpdate, onError } = createHook();

      await act(async () => {
        await result.current.refreshSession(true);
      });

      expect(onError).toHaveBeenCalledWith('');
      expect(onSessionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          currentOrganizationId: 'org-1',
          version: 2,
        })
      );
      expect(SessionStorageService.saveSessionToStorage).toHaveBeenCalled();
    });

    it('falls back to valid cached session on non-forced fetch failure', async () => {
      vi.mocked(SessionDataService.fetchSessionData).mockRejectedValue(new Error('fetch failed'));
      vi.mocked(SessionStorageService.loadSessionFromStorage).mockReturnValue(mockSessionData);

      const { result, onSessionUpdate, onError } = createHook();

      await act(async () => {
        await result.current.refreshSession(false);
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('fetch failed');
      });
      expect(onSessionUpdate).toHaveBeenCalledWith(mockSessionData);
    });

    it('does not fall back to cache on forced fetch failure', async () => {
      vi.mocked(SessionDataService.fetchSessionData).mockRejectedValue(new Error('forced fail'));
      vi.mocked(SessionStorageService.loadSessionFromStorage).mockReturnValue(mockSessionData);

      const { result, onSessionUpdate, onError } = createHook();

      await act(async () => {
        await result.current.refreshSession(true);
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('forced fail');
      });
      expect(onSessionUpdate).not.toHaveBeenCalledWith(mockSessionData);
    });
  });

  describe('shouldRefreshOnVisibility', () => {
    it('returns false when tab is hidden, user missing, or no prior refresh', () => {
      const { result } = createHook({ user: null });

      expect(result.current.shouldRefreshOnVisibility(true)).toBe(false);
    });

    it('returns true when last refresh is older than thirty minutes', async () => {
      mockFetchSessionSuccess();

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-01T12:00:00.000Z'));

      const { result } = createHook();

      await forceRefresh(result);

      vi.setSystemTime(new Date('2024-06-01T12:31:00.000Z'));

      expect(result.current.shouldRefreshOnVisibility(true)).toBe(true);

      vi.useRealTimers();
    });
  });
});
