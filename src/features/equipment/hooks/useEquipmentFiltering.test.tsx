import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/features/equipment/hooks/useEquipment', () => ({
  useEquipmentList: vi.fn(),
  useEquipmentSummaries: vi.fn(),
}));

vi.mock('@/services/syncDataService', () => ({
  useSyncTeamsByOrganization: vi.fn(),
}));

vi.mock('@/features/teams/hooks/useTeamManagement', () => ({
  useTeams: vi.fn(() => ({ teams: [], managedTeams: [], isLoading: false, error: null })),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ canManageOrganization: () => true }),
}));

import { useEquipmentFiltering } from './useEquipmentFiltering';
import { useEquipmentList, useEquipmentSummaries } from '@/features/equipment/hooks/useEquipment';
import { useSyncTeamsByOrganization } from '@/services/syncDataService';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const summariesFixture = [
  { id: 'eq1', name: 'Excavator', manufacturer: 'Acme', location: 'NY', team_id: null },
  { id: 'eq2', name: 'Bulldozer', manufacturer: 'Globex', location: 'SF', team_id: 'team-1' },
  { id: 'eq3', name: 'Forklift', manufacturer: 'Acme', location: 'LA', team_id: 'team-2' },
];

const teamFixtures = [
  { id: 'team-1', name: 'Team One' },
  { id: 'team-2', name: 'Team Two' },
];

beforeEach(() => {
  (useEquipmentList as Mock).mockReturnValue({
    data: { data: [], count: 0 },
    isLoading: false,
  });
  (useEquipmentSummaries as Mock).mockReturnValue({
    data: summariesFixture,
    isLoading: false,
  });
  (useSyncTeamsByOrganization as Mock).mockReturnValue({
    data: teamFixtures,
    isLoading: false,
  });
});

describe('useEquipmentFiltering (server-paginated)', () => {
  it('passes status filter to server-side useEquipmentList', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });
    act(() => result.current.updateFilter('status', 'active'));

    const lastCall = (useEquipmentList as Mock).mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('org-1');
    expect(lastCall?.[1]).toMatchObject({ status: 'active' });
  });

  it('passes manufacturer filter to server-side useEquipmentList', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });
    act(() => result.current.updateFilter('manufacturer', 'Globex'));
    const lastCall = (useEquipmentList as Mock).mock.calls.at(-1);
    expect(lastCall?.[1]).toMatchObject({ manufacturer: 'Globex' });
  });

  it('passes maintenance date range to server-side useEquipmentList', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });
    const from = '2025-01-01';
    const to = '2025-12-31';
    act(() => {
      result.current.updateFilter('maintenanceDateFrom', from);
      result.current.updateFilter('maintenanceDateTo', to);
    });
    const lastCall = (useEquipmentList as Mock).mock.calls.at(-1);
    expect(lastCall?.[1]).toMatchObject({ maintenanceDateFrom: from, maintenanceDateTo: to });
  });

  it('translates the unassigned team sentinel to team: "unassigned"', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });
    act(() => result.current.updateFilter('team', 'unassigned'));
    const lastCall = (useEquipmentList as Mock).mock.calls.at(-1);
    expect(lastCall?.[1]).toMatchObject({ team: 'unassigned' });
  });

  it('translates "all" sentinel to undefined so the server applies no filter', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });
    act(() => result.current.updateFilter('manufacturer', 'all'));
    const lastCall = (useEquipmentList as Mock).mock.calls.at(-1);
    // PostgREST treats undefined predicates as no-ops, so "all" maps to undefined.
    expect(lastCall?.[1]?.manufacturer).toBeUndefined();
  });

  it('passes warrantyExpiring as a boolean filter', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });
    act(() => result.current.updateFilter('warrantyExpiring', true));
    const lastCall = (useEquipmentList as Mock).mock.calls.at(-1);
    expect(lastCall?.[1]).toMatchObject({ warrantyExpiring: true });
  });

  it('applies quick filters and sets the right server params', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });

    act(() => result.current.applyQuickFilter('warranty-expiring'));
    expect(result.current.filters.warrantyExpiring).toBe(true);

    act(() => result.current.applyQuickFilter('recently-added'));
    expect(result.current.sortConfig).toEqual({ field: 'created_at', direction: 'desc' });

    act(() => result.current.applyQuickFilter('active-only'));
    expect(result.current.filters.status).toBe('active');

    const lastCall = (useEquipmentList as Mock).mock.calls.at(-1);
    expect(lastCall?.[1]).toMatchObject({ status: 'active' });
    // pagination/sort options are passed in the third arg
    expect(lastCall?.[2]).toMatchObject({ page: 1, sortField: 'name', sortDirection: 'asc' });
  });

  it('does not reset pagination when updateFilter is a no-op (e.g. team mirror sync)', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });

    act(() => result.current.setCurrentPage(2));
    expect(result.current.currentPage).toBe(2);

    // No-op: setting team to its current value 'all' should not bump page back to 1
    act(() => result.current.updateFilter('team', 'all'));
    expect(result.current.currentPage).toBe(2);
  });

  it('exposes server-driven totalFilteredCount and computes totalPages', () => {
    (useEquipmentList as Mock).mockReturnValue({
      data: { data: Array.from({ length: 10 }, (_, i) => ({ id: `e${i}` })), count: 27 },
      isLoading: false,
    });
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });
    expect(result.current.totalFilteredCount).toBe(27);
    // 27 / 10 -> 3 pages
    expect(result.current.totalPages).toBe(3);
  });

  it('derives manufacturers and locations from the lightweight summaries query', () => {
    const { result } = renderHook(() => useEquipmentFiltering('org-1'), { wrapper });
    expect(result.current.filterOptions.manufacturers).toEqual(['Acme', 'Globex']);
    expect(result.current.filterOptions.locations).toEqual(['LA', 'NY', 'SF']);
  });
});
