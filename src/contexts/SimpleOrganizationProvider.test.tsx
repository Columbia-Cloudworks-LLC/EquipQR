import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SimpleOrganizationProvider } from '@/contexts/SimpleOrganizationProvider';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';
import type { SessionOrganization } from '@/contexts/SessionContext';
import { DASHBOARD_CURRENT_ORG_STORAGE_KEY } from '@/utils/organizationSelection';

const CURRENT_ORG_STORAGE_KEY = DASHBOARD_CURRENT_ORG_STORAGE_KEY;

const sessionOrg: SessionOrganization = {
  id: 'session-org',
  name: 'Session Org',
  plan: 'free',
  memberCount: 1,
  maxMembers: 5,
  features: [],
  scanLocationCollectionEnabled: true,
  userRole: 'owner',
  userStatus: 'active',
};

const mockSession = vi.hoisted(() => ({
  sessionData: {
    currentOrganizationId: 'session-org' as string | null,
    organizations: [] as SessionOrganization[],
    teamMemberships: [],
    lastUpdated: '2026-01-01T00:00:00Z',
    version: 1,
  },
  isLoading: false,
  switchOrganization: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: () => mockSession,
}));

vi.mock('@/lib/queryPersistence', () => ({
  setActivePersistenceScope: vi.fn(),
}));

// Silence the expected stale-org reset warning (#1148) — the stale-org
// transition under test intentionally triggers logger.warn in the provider.
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'organization_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }

      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }

      if (table === 'personal_organizations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SimpleOrganizationProvider>{children}</SimpleOrganizationProvider>
    </QueryClientProvider>
  );
};

describe('SimpleOrganizationProvider syncWithSession', () => {
  beforeEach(() => {
    localStorage.clear();
    mockSession.sessionData = {
      currentOrganizationId: 'session-org',
      organizations: [],
      teamMemberships: [],
      lastUpdated: '2026-01-01T00:00:00Z',
      version: 1,
    };
    mockSession.isLoading = false;
    vi.clearAllMocks();
  });

  it('does not rerender-loop when session org mismatches but organizations are still empty', async () => {
    localStorage.setItem(CURRENT_ORG_STORAGE_KEY, 'stale-org');

    const { result } = renderHook(() => useSimpleOrganization(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.organizationId).toBe('stale-org');
    expect(result.current.organizations).toEqual([]);
  });

  it('follows session org once when the session org appears in the organizations list', async () => {
    localStorage.setItem(CURRENT_ORG_STORAGE_KEY, 'stale-org');
    mockSession.sessionData = {
      currentOrganizationId: 'session-org',
      organizations: [sessionOrg],
      teamMemberships: [],
      lastUpdated: '2026-01-01T00:00:00Z',
      version: 1,
    };

    const { result } = renderHook(() => useSimpleOrganization(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.organizationId).toBe('session-org');
    });

    expect(localStorage.getItem(CURRENT_ORG_STORAGE_KEY)).toBe('session-org');
    expect(result.current.currentOrganization?.id).toBe('session-org');
  });
});
