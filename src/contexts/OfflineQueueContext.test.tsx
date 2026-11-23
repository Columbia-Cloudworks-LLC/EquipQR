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

import {
  OfflineQueueProviderForOrganization,
  useOfflineQueue,
} from './OfflineQueueContext';
import { OfflineQueueService } from '@/services/offlineQueueService';

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
});
