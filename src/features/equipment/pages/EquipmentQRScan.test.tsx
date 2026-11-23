import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EquipmentQRScan from '@/features/equipment/pages/EquipmentQRScan';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from '@/hooks/useSession';
import {
  readRememberedTeamMemberships,
  useOfflineEquipmentDownload,
} from '@/features/offline-queue/hooks/useOfflineEquipmentDownload';
import { useBrowserOnline } from '@/hooks/useBrowserOnline';
import { useEquipmentById, useEquipmentSummaries } from '@/features/equipment/hooks/useEquipment';
import { fetchEquipmentQRPayload, insertScan } from '@/features/equipment/services/equipmentQRPermissions';
import {
  queueOfflineScan,
  readPendingQRWorkingHours,
} from '@/features/equipment/services/equipmentQRActionService';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';

const replaceMock = vi.fn();
const assignMock = vi.fn();

const EQUIPMENT_ID = 'aa0e8400-e29b-41d4-a716-446655440000';
const ORG_ID = 'org-1';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isLoading: false })),
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: vi.fn(() => ({
    sessionData: null,
    isLoading: false,
    error: null,
    hasTeamRole: () => false,
    hasTeamAccess: () => false,
    canManageTeam: () => false,
    getUserTeamIds: () => [],
    refreshSession: vi.fn(),
  })),
}));

vi.mock('@/hooks/useBrowserOnline', () => ({
  useBrowserOnline: vi.fn(() => true),
}));

vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipmentById: vi.fn(() => ({ data: undefined })),
  useEquipmentSummaries: vi.fn(() => ({ data: undefined })),
}));

const quickActionsProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));

vi.mock('@/features/equipment/components/qr/EquipmentQRQuickActions', () => ({
  default: (props: Record<string, unknown>) => {
    quickActionsProps.current = props;
    return <div>Quick actions</div>;
  },
}));

vi.mock('@/features/equipment/services/equipmentQRActionService', () => ({
  queueOfflineScan: vi.fn(),
  readPendingQRWorkingHours: vi.fn(() => null),
}));

vi.mock('@/features/offline-queue/hooks/useOfflineEquipmentDownload', () => ({
  useOfflineEquipmentDownload: vi.fn(),
  readRememberedTeamMemberships: vi.fn(() => null),
  useRememberTeamMemberships: vi.fn(),
}));

vi.mock('@/contexts/OfflineQueueContext', () => ({
  OfflineQueueProviderForOrganization: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useOfflineQueueOptional: vi.fn(() => null),
}));

vi.mock('@/lib/queryPersistence', () => ({
  setActivePersistenceScope: vi.fn(),
}));

vi.mock('@/features/equipment/components/qr/EquipmentQROpenWorkOrders', () => ({
  default: () => null,
}));

vi.mock('@/features/equipment/components/qr/EquipmentQRLastPMCard', () => ({
  default: () => null,
}));

vi.mock('@/features/equipment/components/EquipmentServiceSummaryBadge', () => ({
  EquipmentServiceSummaryBadge: () => null,
}));

vi.mock('@/features/pm-templates/hooks/usePMData', () => ({
  useLatestCompletedPMDetails: vi.fn(() => ({ data: null, isLoading: false, isError: false })),
}));

vi.mock('@/features/equipment/services/equipmentQRPermissions', () => ({
  fetchEquipmentQRPayload: vi.fn(),
  resolveEquipmentQRDisplayImageUrl: vi.fn(),
  userLimitsSensitivePi: vi.fn(),
  insertScan: vi.fn(),
}));

describe('EquipmentQRScan (#1074)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    replaceMock.mockReset();
    assignMock.mockReset();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, replace: replaceMock, assign: assignMock },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not throw outside SimpleOrganizationProvider and stores pendingRedirect when signed out', async () => {
    render(
      <MemoryRouter initialEntries={['/qr/equipment/aa0e8400-e29b-41d4-a716-446655440000']}>
        <Routes>
          <Route path="/qr/equipment/:equipmentId" element={<EquipmentQRScan />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(sessionStorage.getItem('pendingRedirect')).toBe(
        '/qr/equipment/aa0e8400-e29b-41d4-a716-446655440000?qr=true',
      );
    });
    expect(replaceMock).toHaveBeenCalledWith('/auth?tab=signin');
  });
  describe('with a signed-in user', () => {
    const renderScan = () =>
      render(
        <MemoryRouter initialEntries={[`/qr/equipment/${EQUIPMENT_ID}?org=${ORG_ID}`]}>
          <Routes>
            <Route path="/qr/equipment/:equipmentId" element={<EquipmentQRScan />} />
          </Routes>
        </MemoryRouter>,
      );

    const savedSummary = {
      id: EQUIPMENT_ID,
      organization_id: ORG_ID,
      name: 'CAT 320 Excavator',
      manufacturer: 'CAT',
      model: '320',
      serial_number: 'SN-1',
      status: 'active' as const,
      team_id: null,
      location: 'Dallas, TX',
      image_url: null,
      working_hours: 1542,
      last_maintenance: null,
      last_known_location: null,
      default_pm_template_id: null,
    };

    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-1' },
        isLoading: false,
      } as ReturnType<typeof useAuth>);
      vi.mocked(useSession).mockReturnValue({
        sessionData: {
          currentOrganizationId: ORG_ID,
          organizations: [
            {
              id: ORG_ID,
              name: 'Apex Construction',
              plan: 'free',
              memberCount: 1,
              maxMembers: 5,
              features: [],
              userRole: 'member',
              userStatus: 'active',
              scanLocationCollectionEnabled: false,
            },
          ],
          teamMemberships: [],
          lastUpdated: '2026-11-22T00:00:00Z',
          version: 1,
        },
        isLoading: false,
        error: null,
        hasTeamRole: () => false,
        hasTeamAccess: () => false,
        canManageTeam: () => false,
        getUserTeamIds: () => [],
        refreshSession: vi.fn(),
        getCurrentOrganization: () => null,
        switchOrganization: vi.fn(),
        clearSession: vi.fn(),
      } as ReturnType<typeof useSession>);
      vi.mocked(useEquipmentById).mockReturnValue({ data: undefined } as ReturnType<typeof useEquipmentById>);
      vi.mocked(useEquipmentSummaries).mockReturnValue({
        data: [savedSummary],
      } as ReturnType<typeof useEquipmentSummaries>);
    });

    it('shows the same page and actions with no connection, and keeps the scan', async () => {
      vi.mocked(useBrowserOnline).mockReturnValue(false);
      vi.mocked(queueOfflineScan).mockResolvedValue('offline-scan-1');
      vi.mocked(useOfflineQueueOptional).mockReturnValue({
        pendingCount: 1,
        failedCount: 0,
        isSyncing: false,
      } as ReturnType<typeof useOfflineQueueOptional>);

      renderScan();

      expect(await screen.findByText('CAT 320 Excavator')).toBeInTheDocument();
      // Same quick actions as online: no separate offline path.
      expect(await screen.findByText('Quick actions')).toBeInTheDocument();
      expect(quickActionsProps.current).toMatchObject({
        equipment: expect.objectContaining({ id: EQUIPMENT_ID, organizationId: ORG_ID }),
        userRole: 'member',
        savedTeamMemberships: [],
      });
      // The live lookup can only fail offline, so it is not attempted.
      expect(fetchEquipmentQRPayload).not.toHaveBeenCalled();

      // The scan is kept with the time it happened, to be recorded on sync.
      await waitFor(() => expect(queueOfflineScan).toHaveBeenCalledTimes(1));
      const queued = vi.mocked(queueOfflineScan).mock.calls[0][0];
      expect(queued).toMatchObject({ organizationId: ORG_ID, equipmentId: EQUIPMENT_ID });
      expect(Math.abs(Date.now() - new Date(queued.scannedAt).getTime())).toBeLessThan(60_000);
      expect(insertScan).not.toHaveBeenCalled();
      expect(await screen.findByText('Scan saved on this device')).toBeInTheDocument();
      expect(screen.getByText('1 change saved on this device, waiting to sync')).toBeInTheDocument();
    });

    it('keeps the scan when the connection drops before it is logged', async () => {
      vi.mocked(useBrowserOnline).mockReturnValue(true);
      vi.mocked(fetchEquipmentQRPayload).mockResolvedValue({
        equipment: {
          id: EQUIPMENT_ID,
          name: 'CAT 320 Excavator',
          manufacturer: 'CAT',
          model: '320',
          serialNumber: 'SN-1',
          status: 'active',
          location: null,
          workingHours: 10,
          imageReference: null,
          defaultPmTemplateId: null,
          team: null,
        },
        organization: { id: ORG_ID, name: 'Apex Construction', scan_location_collection_enabled: false },
        userRole: 'member',
      });
      vi.mocked(insertScan).mockRejectedValue(new Error('TypeError: Failed to fetch'));
      vi.mocked(queueOfflineScan).mockResolvedValue('offline-scan-2');

      renderScan();

      expect(await screen.findByText('Scan saved on this device')).toBeInTheDocument();
      expect(queueOfflineScan).toHaveBeenCalledTimes(1);
    });

    it('reports a scan the server refused instead of queueing it', async () => {
      vi.mocked(useBrowserOnline).mockReturnValue(true);
      vi.mocked(fetchEquipmentQRPayload).mockResolvedValue({
        equipment: {
          id: EQUIPMENT_ID,
          name: 'CAT 320 Excavator',
          manufacturer: 'CAT',
          model: '320',
          serialNumber: 'SN-1',
          status: 'active',
          location: null,
          workingHours: 10,
          imageReference: null,
          defaultPmTemplateId: null,
          team: null,
        },
        organization: { id: ORG_ID, name: 'Apex Construction', scan_location_collection_enabled: false },
        userRole: 'member',
      });
      vi.mocked(insertScan).mockRejectedValue(new Error('new row violates row-level security policy'));

      renderScan();

      expect(await screen.findByText('Equipment loaded, scan log failed')).toBeInTheDocument();
      expect(queueOfflineScan).not.toHaveBeenCalled();
    });

    it("looks up another organization's saved equipment with that organization's team ids", async () => {
      vi.mocked(useBrowserOnline).mockReturnValue(false);
      vi.mocked(queueOfflineScan).mockResolvedValue('offline-scan-3');
      // The session is for a different organization than the QR code.
      const session = vi.mocked(useSession)();
      vi.mocked(useSession).mockReturnValue({
        ...session,
        sessionData: session.sessionData
          ? { ...session.sessionData, currentOrganizationId: 'org-last-open' }
          : null,
        getUserTeamIds: () => ['team-from-other-org'],
      });
      vi.mocked(readRememberedTeamMemberships).mockReturnValue([{ teamId: 'team-b', role: 'technician' }]);

      renderScan();

      expect(await screen.findByText('CAT 320 Excavator')).toBeInTheDocument();
      expect(readRememberedTeamMemberships).toHaveBeenCalledWith('user-1', ORG_ID);
      expect(useEquipmentSummaries).toHaveBeenLastCalledWith(
        ORG_ID,
        expect.objectContaining({ userTeamIds: ['team-b'], isOrgAdmin: false }),
      );
      // The same actions are allowed as when that organization is open.
      expect(await screen.findByText('Quick actions')).toBeInTheDocument();
      expect(quickActionsProps.current).toMatchObject({
        savedTeamMemberships: [{ teamId: 'team-b', role: 'technician' }],
      });
      // The download needs the open organization's team ids, so it waits.
      expect(useOfflineEquipmentDownload).toHaveBeenLastCalledWith(
        'user-1',
        ORG_ID,
        expect.objectContaining({ enabled: false }),
      );
    });

    it('shows an hours reading saved earlier and not synced yet when the page is reopened', async () => {
      vi.mocked(useBrowserOnline).mockReturnValue(false);
      vi.mocked(queueOfflineScan).mockResolvedValue('offline-scan-4');
      vi.mocked(readPendingQRWorkingHours).mockReturnValue(1550);

      renderScan();

      expect(await screen.findByText('Quick actions')).toBeInTheDocument();
      expect(readPendingQRWorkingHours).toHaveBeenCalledWith('user-1', ORG_ID, EQUIPMENT_ID);
      // The saved copy says 1542; the next update must start from 1550.
      await waitFor(() =>
        expect(quickActionsProps.current).toMatchObject({
          equipment: expect.objectContaining({ workingHours: 1550 }),
        }),
      );
    });

    it('explains what to do when the equipment was never saved on this device', async () => {
      vi.mocked(useBrowserOnline).mockReturnValue(false);
      vi.mocked(useEquipmentSummaries).mockReturnValue({
        data: [{ ...savedSummary, id: 'some-other-equipment' }],
      } as ReturnType<typeof useEquipmentSummaries>);

      renderScan();

      expect(
        await screen.findByText(/this equipment has not been saved on this device yet/),
      ).toBeInTheDocument();
    });

    it('removes equipment loaded earlier when a later lookup is refused', async () => {
      vi.mocked(useBrowserOnline).mockReturnValue(true);
      vi.mocked(insertScan).mockRejectedValue(new Error('not needed for this test'));
      vi.mocked(fetchEquipmentQRPayload).mockResolvedValueOnce({
        equipment: {
          id: EQUIPMENT_ID,
          name: 'CAT 320 Excavator',
          manufacturer: 'CAT',
          model: '320',
          serialNumber: 'SN-1',
          status: 'active',
          location: null,
          workingHours: 10,
          imageReference: null,
          defaultPmTemplateId: null,
          team: null,
        },
        organization: { id: ORG_ID, name: 'Apex Construction', scan_location_collection_enabled: false },
        userRole: 'member',
      });
      // A new element each time: React skips re-rendering an identical one.
      const page = () => (
        <MemoryRouter initialEntries={[`/qr/equipment/${EQUIPMENT_ID}?org=${ORG_ID}`]}>
          <Routes>
            <Route path="/qr/equipment/:equipmentId" element={<EquipmentQRScan />} />
          </Routes>
        </MemoryRouter>
      );
      const { rerender } = render(page());
      expect(await screen.findByText('CAT 320 Excavator')).toBeInTheDocument();

      // Signal drops, then returns after access to the equipment was removed.
      vi.mocked(useBrowserOnline).mockReturnValue(false);
      rerender(page());
      vi.mocked(fetchEquipmentQRPayload).mockRejectedValue(
        new Error('You do not have access to this equipment'),
      );
      vi.mocked(useBrowserOnline).mockReturnValue(true);
      rerender(page());

      expect(await screen.findByText('You do not have access to this equipment')).toBeInTheDocument();
      expect(screen.queryByText('CAT 320 Excavator')).not.toBeInTheDocument();
      expect(screen.queryByText('Quick actions')).not.toBeInTheDocument();
    });

    it('does not fall back to saved details when the server refuses access', async () => {
      vi.mocked(useBrowserOnline).mockReturnValue(true);
      vi.mocked(fetchEquipmentQRPayload).mockRejectedValue(
        new Error('You do not have access to this equipment'),
      );

      renderScan();

      expect(await screen.findByText('You do not have access to this equipment')).toBeInTheDocument();
      expect(screen.queryByText('CAT 320 Excavator')).not.toBeInTheDocument();
    });
  });
});
