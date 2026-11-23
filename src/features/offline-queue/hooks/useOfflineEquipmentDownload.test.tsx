import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
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

vi.mock('@/hooks/useBrowserOnline', () => ({
  useBrowserOnline: vi.fn(() => true),
}));

import {
  downloadEquipmentForOffline,
  useOfflineEquipmentDownload,
} from './useOfflineEquipmentDownload';
import { useBrowserOnline } from '@/hooks/useBrowserOnline';
import { equipment as equipmentKeys, queryKeys } from '@/lib/queryKeys';

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

  it('downloads again after an app update, because the saved copy is discarded with the old version', async () => {
    const { wrapper } = setup();
    const previousVersionMarker = 'equipqr_offline_equipment_download_0.0.1-previous_user-1_org-1_admin';
    localStorage.setItem(previousVersionMarker, String(Date.now()));

    renderHook(() => useOfflineEquipmentDownload('user-1', ORG_ID, { isOrgAdmin: true }), { wrapper });
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockGetAllFullRecords).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(previousVersionMarker)).toBeNull();
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
