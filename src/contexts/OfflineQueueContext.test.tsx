import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' } })),
}));

vi.mock('@/hooks/useBrowserOnline', () => ({
  useBrowserOnline: vi.fn(() => false),
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

// Stands in for a sync run that gets every queued item onto the server.
vi.mock('@/services/offlineQueueProcessor', () => ({
  OfflineQueueProcessor: class {
    constructor(private queue: { getAll: () => { id: string }[]; remove: (id: string) => void }) {}
    async processAll() {
      const items = this.queue.getAll();
      items.forEach((item) => this.queue.remove(item.id));
      return { succeeded: items.length, failed: 0, remaining: 0, conflicts: [] };
    }
  },
}));

import {
  OfflineQueueProviderForOrganization,
  useOfflineQueue,
} from './OfflineQueueContext';
import { OfflineQueueService } from '@/services/offlineQueueService';
import { SessionContext } from '@/contexts/SessionContext';

function PendingCount() {
  const { pendingCount } = useOfflineQueue();
  return <p>pending: {pendingCount}</p>;
}

function renderForOrganization(organizationId: string | null) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <OfflineQueueProviderForOrganization organizationId={organizationId}>
        <PendingCount />
      </OfflineQueueProviderForOrganization>
    </QueryClientProvider>,
  );
}

describe('OfflineQueueProviderForOrganization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('runs the queue of the organization it is given, without an organization provider', () => {
    new OfflineQueueService('user-1', 'org-1').enqueue({
      type: 'equipment_scan',
      payload: { scanId: 'scan-1', equipmentId: 'eq-1', scannedAt: '2026-11-22T10:15:00.000Z' },
      organizationId: 'org-1',
      userId: 'user-1',
    });

    renderForOrganization('org-1');

    expect(screen.getByText('pending: 1')).toBeInTheDocument();
  });

  it('notices changes saved through another service instance (the scan page actions)', async () => {
    renderForOrganization('org-1');
    expect(screen.getByText('pending: 0')).toBeInTheDocument();

    act(() => {
      new OfflineQueueService('user-1', 'org-1').enqueue({
        type: 'equipment_hours',
        payload: { equipmentId: 'eq-1', newHours: 125 },
        organizationId: 'org-1',
        userId: 'user-1',
      });
    });

    await waitFor(() => expect(screen.getByText('pending: 1')).toBeInTheDocument());
  });

  it('does not show another organization’s queue', () => {
    new OfflineQueueService('user-1', 'org-2').enqueue({
      type: 'equipment_hours',
      payload: { equipmentId: 'eq-9', newHours: 5 },
      organizationId: 'org-2',
      userId: 'user-1',
    });

    renderForOrganization('org-1');

    expect(screen.getByText('pending: 0')).toBeInTheDocument();
  });

  it('reloads the session after a team created offline syncs, so it shows in the team switcher', async () => {
    const refreshSession = vi.fn().mockResolvedValue(undefined);
    const session: React.ContextType<typeof SessionContext> = {
      sessionData: null,
      isLoading: false,
      error: null,
      getCurrentOrganization: () => null,
      switchOrganization: () => undefined,
      hasTeamRole: () => false,
      hasTeamAccess: () => false,
      canManageTeam: () => false,
      getUserTeamIds: () => [],
      refreshSession,
      clearSession: () => undefined,
    };
    const queue = new OfflineQueueService('user-1', 'org-1');
    const enqueueHours = () =>
      queue.enqueue({
        type: 'equipment_hours',
        payload: { equipmentId: 'eq-1', newHours: 125 },
        organizationId: 'org-1',
        userId: 'user-1',
      });
    enqueueHours();

    function SyncButton() {
      const { syncNow } = useOfflineQueue();
      return <button onClick={() => void syncNow()}>sync</button>;
    }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SessionContext.Provider value={session}>
          <OfflineQueueProviderForOrganization organizationId="org-1">
            <SyncButton />
            <PendingCount />
          </OfflineQueueProviderForOrganization>
        </SessionContext.Provider>
      </QueryClientProvider>,
    );

    // A sync with no team in it leaves the session alone.
    await act(async () => screen.getByText('sync').click());
    await waitFor(() => expect(screen.getByText('pending: 0')).toBeInTheDocument());
    expect(refreshSession).not.toHaveBeenCalled();

    act(() => {
      queue.enqueue({
        type: 'team_create',
        payload: { team: { id: 'team-1', name: 'Night crew', organization_id: 'org-1' }, creatorId: 'user-1' },
        organizationId: 'org-1',
        userId: 'user-1',
      });
    });
    await waitFor(() => expect(screen.getByText('pending: 1')).toBeInTheDocument());
    await act(async () => screen.getByText('sync').click());

    await waitFor(() => expect(refreshSession).toHaveBeenCalledWith(true));
  });
});
