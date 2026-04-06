/**
 * Re-export shim — canonical implementation lives in useTeamManagement.ts
 *
 * All imports of `useTeams` from this file now resolve to the consolidated,
 * repository-backed hook with access-snapshot filtering.
 */

export { useTeams } from '@/features/teams/hooks/useTeamManagement';

export type { Team, TeamMember } from '@/features/teams/types/team';
