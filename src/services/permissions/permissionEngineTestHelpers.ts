import { personas } from '@vitest-harness/fixtures/personas';
import { teams } from '@vitest-harness/fixtures/entities';
import type { UserContext, Role, TeamRole } from '@/types/permissions';

export const ACME_ORG_ID = 'org-acme';

export const maintenanceTeamContext = () => ({ teamId: teams.maintenance.id });
export const fieldTeamContext = () => ({ teamId: teams.field.id });

export const createUserContext = (personaKey: keyof typeof personas): UserContext => {
  const persona = personas[personaKey];
  return {
    userId: persona.id,
    organizationId: ACME_ORG_ID,
    userRole: persona.organizationRole as Role,
    teamMemberships: persona.teamMemberships.map((tm) => ({
      teamId: tm.teamId,
      role: tm.role as TeamRole,
    })),
  };
};

export const createMemberContextWithTeamRole = (teamRole: TeamRole): UserContext => ({
  userId: `member-${teamRole}-id`,
  organizationId: ACME_ORG_ID,
  userRole: 'member',
  teamMemberships: [
    {
      teamId: teams.maintenance.id,
      role: teamRole,
    },
  ],
});
