import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetSummaries = vi.hoisted(() => vi.fn());
const mockGetAllFullRecords = vi.hoisted(() => vi.fn());
const mockListTemplates = vi.hoisted(() => vi.fn());

vi.mock('@/features/equipment/services/EquipmentService', () => ({
  EquipmentService: { getSummaries: mockGetSummaries, getAllFullRecords: mockGetAllFullRecords },
}));

vi.mock('@/features/pm-templates/services/pmChecklistTemplatesService', () => ({
  pmChecklistTemplatesService: { listTemplates: mockListTemplates },
}));

const mockDownloadWorkOrders = vi.hoisted(() => vi.fn());
const mockDownloadInventory = vi.hoisted(() => vi.fn());

vi.mock('@/features/offline-queue/services/offlineWorkDataDownload', () => ({
  downloadWorkOrdersForOffline: mockDownloadWorkOrders,
  downloadInventoryForOffline: mockDownloadInventory,
}));

vi.mock('@/hooks/useBrowserOnline', () => ({
  useBrowserOnline: vi.fn(() => true),
}));

import {
  downloadEquipmentForOffline,
  readLastOfflineDownload,
  readRememberedTeamMemberships,
  useOfflineEquipmentDownload,
  useRememberTeamMemberships,
} from './useOfflineEquipmentDownload';
import { useBrowserOnline } from '@/hooks/useBrowserOnline';
import { equipment as equipmentKeys, queryKeys } from '@/lib/queryKeys';
import { offlineSavedKeys } from '@/features/offline-queue/utils/offlineSavedData';

const ORG_ID = 'org-1';
const records = [
  { id: 'eq-1', name: 'CAT 320' },
  { id: 'eq-2', name: 'Bobcat S770' },
];

function setup() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('offline equipment download', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.mocked(useBrowserOnline).mockReturnValue(true);
    mockGetSummaries.mockReset().mockResolvedValue({ success: true, data: records });
    mockGetAllFullRecords.mockReset().mockResolvedValue({ success: true, data: records });
    mockListTemplates.mockReset().mockResolvedValue([{ id: 'template-1' }]);
    mockDownloadWorkOrders.mockReset().mockResolvedValue(true);
    mockDownloadInventory.mockReset().mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves the list, every full record and the PM templates under the keys the screens read', async () => {
    const { queryClient } = setup();

    const complete = await downloadEquipmentForOffline(queryClient, ORG_ID, {
      userTeamIds: ['team-b', 'team-a'],
      isOrgAdmin: false,
    });

    expect(complete).toBe(true);
    expect(
      queryClient.getQueryData(['equipment', ORG_ID, 'summaries', ['team-b', 'team-a'], false]),
    ).toEqual(records);
    // Same key the equipment record page and the scan page use for a team-scoped member.
    expect(
      queryClient.getQueryData(equipmentKeys.byIdScoped(ORG_ID, 'eq-2', 'team-a,team-b')),
    ).toEqual(records[1]);
    expect(queryClient.getQueryData(queryKeys.pmTemplates.list(ORG_ID))).toEqual([{ id: 'template-1' }]);
    // The whole list in one entry, for the Equipment screen with no signal.
    expect(
      queryClient.getQueryData(offlineSavedKeys.equipmentList(ORG_ID, 'team-a,team-b')),
    ).toEqual(records);
  });

  it('saves the list the work order form and other pickers read, which has no team scope', async () => {
    const everyMachine = [...records, { id: 'eq-3', name: 'Genie Lift' }];
    mockGetSummaries.mockImplementation((_org: string, scope?: { userTeamIds?: string[] }) =>
      Promise.resolve({ success: true, data: scope?.userTeamIds ? records : everyMachine }),
    );
    const { queryClient } = setup();

    await downloadEquipmentForOffline(queryClient, ORG_ID, { userTeamIds: ['team-a'], isOrgAdmin: false });

    expect(queryClient.getQueryData(['equipment', ORG_ID, 'summaries', undefined, undefined])).toEqual(
      everyMachine,
    );
  });

  it('reuses the admin list for the pickers instead of asking twice', async () => {
    const { queryClient } = setup();

    await downloadEquipmentForOffline(queryClient, ORG_ID, { isOrgAdmin: true });

    expect(mockGetSummaries).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(['equipment', ORG_ID, 'summaries', undefined, undefined])).toEqual(records);
  });

  it('saves admin records under the admin scope', async () => {
    const { queryClient } = setup();

    await downloadEquipmentForOffline(queryClient, ORG_ID, { isOrgAdmin: true });

    expect(
      queryClient.getQueryData(equipmentKeys.byIdScoped(ORG_ID, 'eq-1', 'org-admin')),
    ).toEqual(records[0]);
  });

  it('reports an incomplete download so it is tried again', async () => {
    const { queryClient } = setup();
    mockGetAllFullRecords.mockResolvedValue({ success: false, error: 'Failed to fetch' });

    await expect(downloadEquipmentForOffline(queryClient, ORG_ID, { isOrgAdmin: true })).resolves.toBe(false);
  });

  it('downloads once while connected, then not again for six hours', async () => {
    const { wrapper } = setup();

    const first = renderHook(() => useOfflineEquipmentDownload('user-1', ORG_ID, { isOrgAdmin: true }), { wrapper });
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockGetAllFullRecords).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderHook(() => useOfflineEquipmentDownload('user-1', ORG_ID, { isOrgAdmin: true }), { wrapper });
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockGetAllFullRecords).toHaveBeenCalledTimes(1);
    second.unmount();

    vi.setSystemTime(Date.now() + 6 * 60 * 60 * 1000 + 1);
    renderHook(() => useOfflineEquipmentDownload('user-1', ORG_ID, { isOrgAdmin: true }), { wrapper });
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockGetAllFullRecords).toHaveBeenCalledTimes(2);
  });

  it('refreshes the saved copy after six hours while the app simply stays open', async () => {
    const { wrapper } = setup();

    renderHook(() => useOfflineEquipmentDownload('user-1', ORG_ID, { isOrgAdmin: true }), { wrapper });
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockGetAllFullRecords).toHaveBeenCalledTimes(1);

    // Still inside the six hours: the periodic check finds nothing to do.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    });
    expect(mockGetAllFullRecords).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 60 * 1000 + 20 * 60 * 1000);
    });
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockGetAllFullRecords).toHaveBeenCalledTimes(2);
  });

  it('checks for a due refresh when the app returns to the foreground', async () => {
    const { wrapper } = setup();

    renderHook(() => useOfflineEquipmentDownload('user-1', ORG_ID, { isOrgAdmin: true }), { wrapper });
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockGetAllFullRecords).toHaveBeenCalledTimes(1);

    // A backgrounded phone pauses timers: only the clock moves.
    vi.setSystemTime(Date.now() + 6 * 60 * 60 * 1000 + 1);
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockGetAllFullRecords).toHaveBeenCalledTimes(2);
  });

  it('downloads again after an app update, because the saved copy is discarded with the old version', async () => {
    const { wrapper } = setup();
    const previousVersionMarker = 'equipqr_offline_data_download_0.0.1-previous_user-1_org-1_org-admin';
    // Left by the release that only saved equipment: it must not count as up to date.
    const equipmentOnlyMarker = 'equipqr_offline_equipment_download_dev_user-1_org-1_org-admin';
    localStorage.setItem(previousVersionMarker, String(Date.now()));
    localStorage.setItem(equipmentOnlyMarker, String(Date.now()));

    renderHook(() => useOfflineEquipmentDownload('user-1', ORG_ID, { isOrgAdmin: true }), { wrapper });
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockGetAllFullRecords).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(previousVersionMarker)).toBeNull();
    expect(localStorage.getItem(equipmentOnlyMarker)).toBeNull();
  });

  it('downloads work orders and inventory too, with the same access scope', async () => {
    const { wrapper, queryClient } = setup();

    renderHook(
      () => useOfflineEquipmentDownload('user-1', ORG_ID, { userTeamIds: ['team-a'], isOrgAdmin: false }),
      { wrapper },
    );
    await vi.advanceTimersByTimeAsync(5000);

    const scope = { userTeamIds: ['team-a'], isOrgAdmin: false };
    expect(mockDownloadWorkOrders).toHaveBeenCalledWith(queryClient, ORG_ID, 'user-1', scope, expect.any(Function));
    expect(mockDownloadInventory).toHaveBeenCalledWith(queryClient, ORG_ID, 'user-1', scope, expect.any(Function));
    expect(readLastOfflineDownload('user-1', ORG_ID, scope)).not.toBeNull();
  });

  it('tries again a minute later when part of the download did not finish', async () => {
    const { wrapper } = setup();
    mockDownloadWorkOrders.mockResolvedValueOnce(false);

    renderHook(() => useOfflineEquipmentDownload('user-1', ORG_ID, { isOrgAdmin: true }), { wrapper });
    await vi.advanceTimersByTimeAsync(5000);
    expect(readLastOfflineDownload('user-1', ORG_ID, { isOrgAdmin: true })).toBeNull();

    // The retry is a state change, so let React apply it before the next wait.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockDownloadWorkOrders).toHaveBeenCalledTimes(2);
    expect(readLastOfflineDownload('user-1', ORG_ID, { isOrgAdmin: true })).not.toBeNull();
  });

  it('keeps a download going when the signal drops part-way, and only abandons it for another user', async () => {
    const { wrapper } = setup();
    let finishRecords: (value: { success: boolean; data: typeof records }) => void = () => {};
    mockGetAllFullRecords.mockReturnValue(new Promise((resolve) => { finishRecords = resolve; }));

    const { rerender } = renderHook(
      ({ userId }: { userId: string }) => useOfflineEquipmentDownload(userId, ORG_ID, { isOrgAdmin: true }),
      { wrapper, initialProps: { userId: 'user-1' } },
    );
    await vi.advanceTimersByTimeAsync(5000);

    // Signal flickers while the request is still out.
    vi.mocked(useBrowserOnline).mockReturnValue(false);
    rerender({ userId: 'user-1' });
    vi.mocked(useBrowserOnline).mockReturnValue(true);
    rerender({ userId: 'user-1' });
    finishRecords({ success: true, data: records });
    await vi.advanceTimersByTimeAsync(100);

    expect(readLastOfflineDownload('user-1', ORG_ID, { isOrgAdmin: true })).not.toBeNull();
    expect(mockGetAllFullRecords).toHaveBeenCalledTimes(1);
  });

  it('abandons a download when the organization changes to one with downloading switched off', async () => {
    const { wrapper } = setup();
    let finishRecords: (value: { success: boolean; data: typeof records }) => void = () => {};
    mockGetAllFullRecords.mockReturnValue(new Promise((resolve) => { finishRecords = resolve; }));

    const { rerender } = renderHook(
      ({ orgId, enabled }: { orgId: string; enabled: boolean }) =>
        useOfflineEquipmentDownload('user-1', orgId, { isOrgAdmin: true, enabled }),
      { wrapper, initialProps: { orgId: ORG_ID, enabled: true } },
    );
    await vi.advanceTimersByTimeAsync(5000);

    rerender({ orgId: 'org-other', enabled: false });
    finishRecords({ success: true, data: records });
    await vi.advanceTimersByTimeAsync(100);

    expect(readLastOfflineDownload('user-1', ORG_ID, { isOrgAdmin: true })).toBeNull();
    expect(readLastOfflineDownload('user-1', 'org-other', { isOrgAdmin: true })).toBeNull();
  });

  it('downloads with team ids in the order the equipment list uses', async () => {
    const { wrapper } = setup();

    renderHook(
      () => useOfflineEquipmentDownload('user-1', ORG_ID, { userTeamIds: ['team-z', 'team-a'], isOrgAdmin: false }),
      { wrapper },
    );
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockGetSummaries).toHaveBeenCalledWith(ORG_ID, {
      userTeamIds: ['team-z', 'team-a'],
      isOrgAdmin: false,
    });
  });

  it("remembers each organization's team memberships once they are known", () => {
    const { wrapper } = setup();
    expect(readRememberedTeamMemberships('user-1', ORG_ID)).toBeNull();

    renderHook(() => useRememberTeamMemberships('user-1', ORG_ID, undefined), { wrapper });
    expect(readRememberedTeamMemberships('user-1', ORG_ID)).toBeNull();

    renderHook(
      () => useRememberTeamMemberships('user-1', ORG_ID, [{ teamId: 'team-b', role: 'manager' }]),
      { wrapper },
    );

    expect(readRememberedTeamMemberships('user-1', ORG_ID)).toEqual([{ teamId: 'team-b', role: 'manager' }]);
    expect(readRememberedTeamMemberships('user-1', 'org-2')).toBeNull();
  });

  it('ignores remembered memberships that are not in the expected shape', () => {
    localStorage.setItem('equipqr_offline_team_scope_user-1_org-1', JSON.stringify([{ teamId: 'team-b', role: 'superuser' }]));
    expect(readRememberedTeamMemberships('user-1', ORG_ID)).toBeNull();
  });

  it('keeps every team role the database has, including team owner', () => {
    const { wrapper } = setup();
    const memberships = [
      { teamId: 'team-a', role: 'owner' as const },
      { teamId: 'team-b', role: 'viewer' as const },
    ];

    renderHook(() => useRememberTeamMemberships('user-1', ORG_ID, memberships), { wrapper });

    expect(readRememberedTeamMemberships('user-1', ORG_ID)).toEqual(memberships);
  });

  it('drops results that arrive after the user moved to another organization', async () => {
    const { queryClient } = setup();

    const complete = await downloadEquipmentForOffline(queryClient, ORG_ID, { isOrgAdmin: true }, () => false);

    expect(complete).toBe(false);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('does nothing with no connection or before team access is known', async () => {
    const { wrapper } = setup();
    vi.mocked(useBrowserOnline).mockReturnValue(false);
    renderHook(() => useOfflineEquipmentDownload('user-1', ORG_ID, { isOrgAdmin: true }), { wrapper });
    await vi.advanceTimersByTimeAsync(5000);

    vi.mocked(useBrowserOnline).mockReturnValue(true);
    renderHook(() => useOfflineEquipmentDownload('user-1', ORG_ID, { enabled: false }), { wrapper });
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockGetAllFullRecords).not.toHaveBeenCalled();
  });
});
