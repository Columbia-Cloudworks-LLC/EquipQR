import { describe, expect, it } from 'vitest';
import type { TeamMembership } from '@/contexts/team-context';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';
import {
  canViewWorkOrderCostsForSelectedTeam,
  canViewWorkOrderCostsForWorkOrder,
} from '@/features/work-orders/utils/canViewWorkOrderCostsAccess';

const teamId = 'team-1';
const userId = 'user-1';

const ownerMembership: TeamMembership = {
  team_id: teamId,
  team_name: 'Field Team',
  role: 'owner',
  joined_date: '2026-01-01T00:00:00Z',
};

const requestorMembership: TeamMembership = {
  ...ownerMembership,
  role: 'requestor',
};

describe('canViewWorkOrderCostsForWorkOrder', () => {
  it('allows org admins regardless of team membership', () => {
    expect(
      canViewWorkOrderCostsForWorkOrder(
        { team_id: teamId, assignee_id: 'someone-else' },
        { userId, isOrgAdmin: true, teamMemberships: [] },
      ),
    ).toBe(true);
  });

  it('allows the work order assignee even without team membership', () => {
    expect(
      canViewWorkOrderCostsForWorkOrder(
        { team_id: teamId, assignee_id: userId },
        { userId, isOrgAdmin: false, teamMemberships: [] },
      ),
    ).toBe(true);
  });

  it('allows team owners on the work order team', () => {
    expect(
      canViewWorkOrderCostsForWorkOrder(
        { team_id: teamId, assignee_id: null },
        { userId, isOrgAdmin: false, teamMemberships: [ownerMembership] },
      ),
    ).toBe(true);
  });

  it('denies requestors and viewers on the work order team', () => {
    expect(
      canViewWorkOrderCostsForWorkOrder(
        { team_id: teamId, assignee_id: null },
        { userId, isOrgAdmin: false, teamMemberships: [requestorMembership] },
      ),
    ).toBe(false);
  });
});

describe('canViewWorkOrderCostsForSelectedTeam', () => {
  it('allows org admins for any selected team scope', () => {
    expect(
      canViewWorkOrderCostsForSelectedTeam(UNASSIGNED_TEAM_ID, {
        userId,
        isOrgAdmin: true,
        teamMemberships: [],
      }),
    ).toBe(true);
  });

  it('allows operational roles on the selected team', () => {
    expect(
      canViewWorkOrderCostsForSelectedTeam(teamId, {
        userId,
        isOrgAdmin: false,
        teamMemberships: [ownerMembership],
      }),
    ).toBe(true);
  });

  it('denies unassigned scope for non-admin operational members', () => {
    expect(
      canViewWorkOrderCostsForSelectedTeam(UNASSIGNED_TEAM_ID, {
        userId,
        isOrgAdmin: false,
        teamMemberships: [ownerMembership],
      }),
    ).toBe(false);
  });

  it('allows assignee-only users on all-teams scope when they have assigned work orders', () => {
    expect(
      canViewWorkOrderCostsForSelectedTeam(
        null,
        { userId, isOrgAdmin: false, teamMemberships: [] },
        { hasAssignedWorkOrders: true, assignedTeamIds: new Set([teamId]) },
      ),
    ).toBe(true);
  });

  it('allows assignee-only users on a selected team when assigned to that team', () => {
    expect(
      canViewWorkOrderCostsForSelectedTeam(
        teamId,
        { userId, isOrgAdmin: false, teamMemberships: [] },
        { hasAssignedWorkOrders: true, assignedTeamIds: new Set([teamId]) },
      ),
    ).toBe(true);
  });
});
