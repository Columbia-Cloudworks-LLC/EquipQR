import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useEquipment', () => ({
  useEquipment: vi.fn(),
}));

vi.mock('@/services/syncDataService', () => ({
  useSyncTeamsByOrganization: vi.fn(),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ canManageOrganization: () => true }),
}));

import { useEquipmentFiltering } from './useEquipmentFiltering';
import { useEquipment } from '@/hooks/useEquipment';
import { useSyncTeamsByOrganization } from '@/services/syncDataService';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const daysFromNow = (days: number) => {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString();
};

const equipmentFixtures = [
  {
    id: 'eq1',
    name: 'Excavator',
    manufacturer: 'Acme',
    model: 'X1',
    serial_number: 'SN-1',
    status: 'active',
    location: 'NY',
    team_id: null,
    last_maintenance: daysFromNow(-7),
    installation_date: '2024-01-15T00:00:00.000Z',
    warranty_expiration: daysFromNow(10),
    created_at: '2025-08-01T00:00:00.000Z',
  },
  {
    id: 'eq2',
    name: 'Bulldozer',
    manufacturer: 'Globex',
    model: 'G-200',
    serial_number: 'SN-2',
    status: 'maintenance',
    location: 'SF',
    team_id: 'team-1',
    last_maintenance: '2025-06-01T00:00:00.000Z',
    installation_date: '2023-12-01T00:00:00.000Z',
    warranty_expiration: daysFromNow(60),
    created_at: '2025-07-20T00:00:00.000Z',
  },
  {
    id: 'eq3',
    name: 'Forklift',
    manufacturer: 'Acme',
    model: 'F-10',
    serial_number: 'SN-3',
    status: 'inactive',
    location: 'LA',
    team_id: 'team-2',
    // no last_maintenance
    installation_date: '2022-05-10T00:00:00.000Z',
    warranty_expiration: daysFromNow(5),
    created_at: '2025-06-01T00:00:00.000Z',
  },
];

const teamFixtures = [
  { id: 'team-1', name: 'Team One' },
  { id: 'team-2', name: 'Team Two' },
];

beforeEach(() => {
  (useEquipment as Mock).mockReturnValue({
    data: equipmentFixtures,
    isLoading: false,
  });
  (useSyncTeamsByOrganization as Mock).mockReturnValue({
    data: teamFixtures,
    isLoading: false,
  });
});

describe('useEquipmentFiltering', () => {
  it('filters by status', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });
    act(() => result.current.updateFilter('status', 'active'));
    expect(result.current.filteredAndSortedEquipment.map(e => e.id)).toEqual(['eq1']);
  });

  it('filters by manufacturer', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });
    act(() => result.current.updateFilter('manufacturer', 'Globex'));
    expect(result.current.filteredAndSortedEquipment.map(e => e.id)).toEqual(['eq2']);
  });

  it('filters by maintenance date range', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });
    const from = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
    act(() => {
      result.current.updateFilter('maintenanceDateFrom', from);
      result.current.updateFilter('maintenanceDateTo', to);
    });
    expect(result.current.filteredAndSortedEquipment.map(e => e.id)).toEqual(['eq1']);
  });

  it('filters by installation date range', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });
    act(() => {
      result.current.updateFilter('installationDateFrom', '2023-01-01');
      result.current.updateFilter('installationDateTo', '2023-12-31');
    });
    expect(result.current.filteredAndSortedEquipment.map(e => e.id)).toEqual(['eq2']);
  });

  it('filters by team including unassigned', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });
    act(() => result.current.updateFilter('team', 'unassigned'));
    expect(result.current.filteredAndSortedEquipment.map(e => e.id)).toEqual(['eq1']);

    act(() => result.current.updateFilter('team', 'team-2'));
    expect(result.current.filteredAndSortedEquipment.map(e => e.id)).toEqual(['eq3']);
  });

  it('filters warranty expiring within 30 days', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });
    act(() => result.current.updateFilter('warrantyExpiring', true));
    expect(result.current.filteredAndSortedEquipment.map(e => e.id).sort()).toEqual(['eq1', 'eq3'].sort());
  });

  it('applies quick filters and sorting', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });

    act(() => result.current.applyQuickFilter('warranty-expiring'));
    expect(result.current.filters.warrantyExpiring).toBe(true);

    act(() => result.current.applyQuickFilter('recently-added'));
    expect(result.current.sortConfig).toEqual({ field: 'created_at', direction: 'desc' });
    // ensure order by created_at desc -> eq1 is latest (created_at: '2025-08-01')
    expect(result.current.filteredAndSortedEquipment.length).toBeGreaterThan(0);
    expect(result.current.filteredAndSortedEquipment[0]?.id).toBe('eq1');

    act(() => result.current.applyQuickFilter('active-only'));
    expect(result.current.filters.status).toBe('active');
  });
});
