import type { TeamMembership } from '@/contexts/team-context';

type SessionTeamMembership = {
  teamId: string;
  teamName: string;
  role: TeamMembership['role'];
  joinedDate: string;
};

export function mapSessionTeamMemberships(
  memberships: SessionTeamMembership[] | undefined,
): TeamMembership[] {
  return (memberships ?? []).map((tm) => ({
    team_id: tm.teamId,
    team_name: tm.teamName,
    role: tm.role,
    joined_date: tm.joinedDate,
  }));
}
