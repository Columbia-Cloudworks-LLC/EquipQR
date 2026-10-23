import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EquipmentQRScan from '@/features/equipment/pages/EquipmentQRScan';
import { useAuth } from '@/hooks/useAuth';
import { fetchEquipmentQRPayload } from '@/features/equipment/services/equipmentQRPermissions';
import { UnassignedQRTagDetectedError } from '@/features/equipment/services/equipmentQRTagService';

const replaceMock = vi.fn();

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
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, replace: replaceMock },
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

  it('renders the Claim / Adopt This Equipment card when an unassigned QR tag is scanned (#1644)', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'tech@example.com' } as never,
      isLoading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithGoogle: vi.fn(),
      resetPassword: vi.fn(),
    });

    vi.mocked(fetchEquipmentQRPayload).mockRejectedValue(
      new UnassignedQRTagDetectedError({
        tag: {
          id: 'aa0e8400-e29b-41d4-a716-446655440000',
          organizationId: 'org-1',
          shortCode: 'EQ-7K9P-2M4X',
          labelBatchName: 'Yard Roll A',
          createdAt: '2026-10-23T12:00:00Z',
        },
        organization: {
          id: 'org-1',
          name: 'Apex Rentals',
          scanLocationCollectionEnabled: false,
        },
        userRole: 'admin',
      }),
    );

    render(
      <MemoryRouter initialEntries={['/qr/equipment/aa0e8400-e29b-41d4-a716-446655440000?org=org-1']}>
        <Routes>
          <Route path="/qr/equipment/:equipmentId" element={<EquipmentQRScan />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Claim / Adopt This Equipment')).toBeInTheDocument();
    });
    expect(screen.getByText('New / Unassigned Tag Detected')).toBeInTheDocument();
    expect(screen.getByText('EQ-7K9P-2M4X')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create New Machine/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search & Attach to Existing/i })).toBeInTheDocument();
  });
});
