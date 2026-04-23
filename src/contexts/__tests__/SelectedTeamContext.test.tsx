import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelectedTeamProvider } from '@/contexts/SelectedTeamContext';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';
import { useSelectedTeam } from '@/hooks/useSelectedTeam';
import type { TeamMembership } from '@/contexts/team-context';

const mockOrganization = vi.hoisted(() => ({
  organizationId: 'org-1' as string | null,
}));

const mockTeam = vi.hoisted(() => ({
  teamMemberships: [] as TeamMembership[],
  isLoading: true,
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ organizationId: mockOrganization.organizationId }),
}));

vi.mock('@/features/teams/hooks/useTeam', () => ({
  useTeam: () => ({
    teamMemberships: mockTeam.teamMemberships,
    isLoading: mockTeam.isLoading,
  }),
}));

const Probe: React.FC = () => {
  const { selectedTeamId, selectedTeam } = useSelectedTeam();
  return (
    <>
      <div data-testid="selected-team-id">{selectedTeamId ?? 'null'}</div>
      <div data-testid="selected-team-name">{selectedTeam?.team_name ?? 'null'}</div>
    </>
  );
};

const STORAGE_KEY = 'equipqr:selectedTeamId:org-1';

describe('SelectedTeamProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    mockOrganization.organizationId = 'org-1';
    mockTeam.teamMemberships = [];
    mockTeam.isLoading = true;
  });

  it('does NOT clear a persisted selected team while team memberships are still loading', () => {
    localStorage.setItem(STORAGE_KEY, 'team-A');
    mockTeam.isLoading = true;
    mockTeam.teamMemberships = [];

    render(
      <SelectedTeamProvider>
        <Probe />
      </SelectedTeamProvider>,
    );

    expect(screen.getByTestId('selected-team-id').textContent).toBe('team-A');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('team-A');
  });

  it('clears the selected team once memberships have settled and the team is no longer visible', () => {
    localStorage.setItem(STORAGE_KEY, 'team-A');
    mockTeam.isLoading = false;
    mockTeam.teamMemberships = [
      { team_id: 'team-B', team_name: 'B', role: 'technician', joined_date: '2024-01-01' },
    ];

    render(
      <SelectedTeamProvider>
        <Probe />
      </SelectedTeamProvider>,
    );

    expect(screen.getByTestId('selected-team-id').textContent).toBe('null');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps the selected team when memberships have settled and the team is still visible', () => {
    localStorage.setItem(STORAGE_KEY, 'team-A');
    mockTeam.isLoading = false;
    mockTeam.teamMemberships = [
      { team_id: 'team-A', team_name: 'A', role: 'manager', joined_date: '2024-01-01' },
    ];

    render(
      <SelectedTeamProvider>
        <Probe />
      </SelectedTeamProvider>,
    );

    expect(screen.getByTestId('selected-team-id').textContent).toBe('team-A');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('team-A');
  });

  it('preserves the UNASSIGNED_TEAM_ID sentinel through the membership-validation effect', () => {
    // The 'unassigned' sentinel does not correspond to any membership row;
    // the auto-clear effect must NOT wipe it just because no membership matches.
    localStorage.setItem(STORAGE_KEY, UNASSIGNED_TEAM_ID);
    mockTeam.isLoading = false;
    mockTeam.teamMemberships = [
      { team_id: 'team-B', team_name: 'B', role: 'technician', joined_date: '2024-01-01' },
    ];

    render(
      <SelectedTeamProvider>
        <Probe />
      </SelectedTeamProvider>,
    );

    expect(screen.getByTestId('selected-team-id').textContent).toBe(UNASSIGNED_TEAM_ID);
    expect(screen.getByTestId('selected-team-name').textContent).toBe('null');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(UNASSIGNED_TEAM_ID);
  });

  it('hydrates the UNASSIGNED_TEAM_ID sentinel from localStorage on mount', () => {
    localStorage.setItem(STORAGE_KEY, UNASSIGNED_TEAM_ID);
    mockTeam.isLoading = true;
    mockTeam.teamMemberships = [];

    render(
      <SelectedTeamProvider>
        <Probe />
      </SelectedTeamProvider>,
    );

    expect(screen.getByTestId('selected-team-id').textContent).toBe(UNASSIGNED_TEAM_ID);
  });
});
