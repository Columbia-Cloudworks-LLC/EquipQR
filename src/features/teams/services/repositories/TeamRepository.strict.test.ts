import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTeams: vi.fn(),
  getMembers: vi.fn(),
  countTeams: vi.fn(),
}));

vi.mock('@/features/teams/services/teamService', () => ({
  getOrganizationTeamsOptimized: mocks.getTeams,
  getTeamMembersByTeamIdsOptimized: mocks.getMembers,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => mocks.countTeams() }) }) },
}));

import TeamRepository from './TeamRepository';

const ORG = 'org-1';
const member = { id: 'm1', team_id: 'a', user_id: 'tech-1', role: 'technician', joined_date: '2026-01-01' };

describe('TeamRepository.getTeamsByOrgStrict', () => {
  beforeEach(() => {
    mocks.getTeams.mockReset();
    mocks.getMembers.mockReset().mockResolvedValue(new Map());
    mocks.countTeams.mockReset().mockResolvedValue({ count: 0, error: null });
  });

  it('returns the teams with their members', async () => {
    mocks.getTeams.mockResolvedValue([{ id: 'a', name: 'Team a', member_count: 1 }]);
    mocks.getMembers.mockResolvedValue(new Map([['a', [member]]]));

    const teams = await TeamRepository.getTeamsByOrgStrict(ORG);

    expect(teams).toHaveLength(1);
    expect(teams[0].members[0].user_id).toBe('tech-1');
  });

  it('returns an empty list for an organization that really has no teams', async () => {
    mocks.getTeams.mockResolvedValue([]);

    expect(await TeamRepository.getTeamsByOrgStrict(ORG)).toEqual([]);
  });

  it('fails instead of answering "no teams" when the request did not get through', async () => {
    // The team service swallows the failure and answers with an empty list.
    mocks.getTeams.mockResolvedValue([]);
    mocks.countTeams.mockResolvedValue({ count: null, error: new Error('TypeError: Failed to fetch') });
    await expect(TeamRepository.getTeamsByOrgStrict(ORG)).rejects.toThrow('Failed to fetch');

    mocks.countTeams.mockResolvedValue({ count: 3, error: null });
    await expect(TeamRepository.getTeamsByOrgStrict(ORG)).rejects.toThrow('Teams could not be loaded');
  });

  it('fails when a team that has members comes back without them', async () => {
    mocks.getTeams.mockResolvedValue([{ id: 'a', name: 'Team a', member_count: 2 }]);

    await expect(TeamRepository.getTeamsByOrgStrict(ORG)).rejects.toThrow('Team members could not be loaded');
  });
});
