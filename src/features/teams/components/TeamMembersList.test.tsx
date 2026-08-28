import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@vitest-harness/utils/test-utils';
import userEvent from '@testing-library/user-event';
import TeamMembersList from './TeamMembersList';
import type { TeamWithMembers } from '@/features/teams/services/teamService';

const mockUseTeamMembers = vi.fn();
const permissions = { canManageTeam: () => true };
const removeMemberMutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: { id: 'org-1' },
  })),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => permissions),
}));

vi.mock('@/features/teams/hooks/useTeamManagement', () => ({
  useTeamMembers: (...args: unknown[]) => mockUseTeamMembers(...args),
}));

vi.mock('./RoleChangeDialog', () => ({
  default: () => null,
}));

const team: TeamWithMembers = {
  id: 'team-1',
  created_at: '2026-08-28T00:00:00.000Z',
  customer_id: null,
  description: 'Field technicians',
  image_url: null,
  location_address: null,
  location_city: null,
  location_country: null,
  location_lat: null,
  location_lng: null,
  location_state: null,
  member_count: 1,
  members: [
    {
      id: 'team-member-1',
      joined_date: '2026-08-28T00:00:00.000Z',
      role: 'technician',
      team_id: 'team-1',
      user_id: 'user-1',
      profiles: {
        name: 'Jane Doe',
        email: 'jane@example.com',
      },
    },
  ],
  name: 'Alpha Team',
  organization_id: 'org-1',
  override_equipment_location: false,
  preferred_view: 'internal',
  team_lead_id: null,
  updated_at: '2026-08-28T00:00:00.000Z',
};

describe('TeamMembersList remove member dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions.canManageTeam = () => true;
    removeMemberMutateAsync.mockResolvedValue(undefined);
    mockUseTeamMembers.mockReturnValue({
      removeMember: {
        isPending: false,
        mutateAsync: removeMemberMutateAsync,
      },
    });
  });

  const openRemoveDialog = async () => {
    const user = userEvent.setup({ delay: null });

    render(<TeamMembersList team={team} />);

    await user.click(
      screen.getByRole('button', { name: /actions for jane doe/i }),
    );
    await user.click(screen.getByRole('menuitem', { name: /remove from team/i }));

    return { user };
  };

  it('shows a confirmation dialog before removing the member', async () => {
    await openRemoveDialog();

    const dialog = screen.getByRole('alertdialog', {
      name: /remove member from team\?/i,
    });

    expect(
      within(dialog).getByText(/organization access stays unchanged/i),
    ).toBeInTheDocument();
    expect(removeMemberMutateAsync).not.toHaveBeenCalled();
  });

  it('calls removeMember with the team id and user id after confirmation', async () => {
    const { user } = await openRemoveDialog();
    const dialog = screen.getByRole('alertdialog', {
      name: /remove member from team\?/i,
    });

    await user.click(
      within(dialog).getByRole('button', { name: /remove from team/i }),
    );

    expect(removeMemberMutateAsync).toHaveBeenCalledWith({
      teamId: 'team-1',
      userId: 'user-1',
    });
  });

  it('does not call removeMember when the confirmation is cancelled', async () => {
    const { user } = await openRemoveDialog();
    const dialog = screen.getByRole('alertdialog', {
      name: /remove member from team\?/i,
    });

    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

    expect(removeMemberMutateAsync).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('alertdialog', { name: /remove member from team\?/i }),
    ).not.toBeInTheDocument();
  });

  it('hides team-member actions when the user cannot manage the team', () => {
    permissions.canManageTeam = () => false;

    render(<TeamMembersList team={team} />);

    expect(screen.queryByRole('button', { name: /actions for/i })).toBeNull();
    expect(
      screen.queryByRole('columnheader', { name: /actions/i }),
    ).toBeNull();
  });
});
