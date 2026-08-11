import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EquipmentQRScan from '@/features/equipment/pages/EquipmentQRScan';

const replaceMock = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isLoading: false })),
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: vi.fn(() => ({ sessionData: null })),
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
});
