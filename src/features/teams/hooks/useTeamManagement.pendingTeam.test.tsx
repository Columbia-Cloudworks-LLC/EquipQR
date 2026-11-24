import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ deleteTeam: vi.fn(), queuedItems: [] as unknown[] }));

vi.mock('@/features/teams/services/repositories/TeamRepository', () => ({
  default: { deleteTeam: mocks.deleteTeam },
}));
vi.mock('@/features/teams/services/teamService', () => ({
  removeTeamMember: vi.fn(),
  getAvailableUsersForTeam: vi.fn(),
}));
vi.mock('@/features/offline-queue/services/offlineWorkDataDownload', () => ({
  downloadTeamsForOffline: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useSession', () => ({ useSession: () => ({ refreshSession: vi.fn() }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useAccessSnapshot', () => ({ useAccessSnapshot: () => ({ data: undefined, isLoading: false }) }));
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { id: 'org-1', userRole: 'owner' } }),
}));
vi.mock('@/features/teams/hooks/useTeam', () => ({ useTeam: () => ({ teamMemberships: [] }) }));
vi.mock('@/contexts/OfflineQueueContext', () => ({
  useOfflineQueueOptional: () => ({ queuedItems: mocks.queuedItems, refresh: vi.fn() }),
}));

import { useTeamMutations } from './useTeamManagement';

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('deleting a team', () => {
  beforeEach(() => {
    mocks.deleteTeam.mockReset().mockResolvedValue(undefined);
    mocks.queuedItems = [];
  });

  it('is refused while the team is still waiting to sync, so the queued create cannot bring it back', async () => {
    mocks.queuedItems = [
      {
        id: 'queue-1',
        type: 'team_create',
        status: 'pending',
        organizationId: 'org-1',
        payload: { team: { id: 'team-new', name: 'Night crew', organization_id: 'org-1' }, creatorId: 'user-1' },
      },
    ];
    const { result } = renderHook(() => useTeamMutations(), { wrapper });

    await expect(
      result.current.deleteTeam.mutateAsync({ teamId: 'team-new', organizationId: 'org-1' }),
    ).rejects.toThrow('has not synced yet');
    expect(mocks.deleteTeam).not.toHaveBeenCalled();
  });

  it('goes to the server for a team that has synced', async () => {
    const { result } = renderHook(() => useTeamMutations(), { wrapper });

    await result.current.deleteTeam.mutateAsync({ teamId: 'team-1', organizationId: 'org-1' });

    expect(mocks.deleteTeam).toHaveBeenCalledWith('team-1', 'org-1');
  });
});
