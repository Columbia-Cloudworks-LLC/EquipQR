import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboardTeamQueryContext } from './useDashboardTeamQueryContext';

const mockGetUserTeamIds = vi.fn(() => ['team-cs']);
const mockUseOrganization = vi.fn();
const mockUseSelectedTeam = vi.fn(() => ({ selectedTeamId: null }));

vi.mock('@/features/teams/hooks/useTeamMembership', () => ({
  useTeamMembership: () => ({
    getUserTeamIds: mockGetUserTeamIds,
    isLoading: false,
  }),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => mockUseOrganization(),
}));

vi.mock('@/hooks/useSelectedTeam', () => ({
  useSelectedTeam: () => mockUseSelectedTeam(),
}));

describe('useDashboardTeamQueryContext (RT-19)', () => {
  it('treats current-org members as non-admin for All teams', () => {
    mockUseOrganization.mockReturnValue({
      currentOrganization: { id: 'metro-org', userRole: 'member' },
    });

    const { result } = renderHook(() => useDashboardTeamQueryContext());

    expect(result.current.isManager).toBe(false);
    expect(result.current.userTeamIds).toEqual(['team-cs']);
  });

  it('treats current-org owners as admin', () => {
    mockUseOrganization.mockReturnValue({
      currentOrganization: { id: 'apex-org', userRole: 'owner' },
    });

    const { result } = renderHook(() => useDashboardTeamQueryContext());

    expect(result.current.isManager).toBe(true);
  });
});
