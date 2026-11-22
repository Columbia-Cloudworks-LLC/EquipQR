import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EquipmentQRScan from '@/features/equipment/pages/EquipmentQRScan';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from '@/hooks/useSession';
import { useBrowserOnline } from '@/hooks/useBrowserOnline';
import { useEquipmentById, useEquipmentSummaries } from '@/features/equipment/hooks/useEquipment';
import { fetchEquipmentQRPayload } from '@/features/equipment/services/equipmentQRPermissions';

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

    it('shows the saved equipment and offers a work order when there is no connection', async () => {
      vi.mocked(useBrowserOnline).mockReturnValue(false);

      renderScan();

      expect(await screen.findByText('CAT 320 Excavator')).toBeInTheDocument();
      expect(screen.getByText(/No connection\. These are the details saved on this device/)).toBeInTheDocument();
      expect(screen.getByText('Scan not recorded (no connection)')).toBeInTheDocument();
      // The live lookup can only fail offline, so it is not attempted.
      expect(fetchEquipmentQRPayload).not.toHaveBeenCalled();
      // The full record was never opened on this device, so only the work order path is offered.
      expect(screen.queryByRole('button', { name: /Open Equipment Record/ })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Create Work Order/ }));

      expect(JSON.parse(sessionStorage.getItem('equipqr_queued_new_work_order') ?? 'null')).toEqual({
        equipmentId: EQUIPMENT_ID,
      });
      expect(assignMock).toHaveBeenCalledWith('/dashboard/work-orders');
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
