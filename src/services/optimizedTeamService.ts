/**
 * @deprecated This file is deprecated. Import from canonical services instead:
 * - Types: import from '@/types/team'
 * - Functions: import from '@/services/teamService'
 * 
 * This file re-exports from the canonical locations for backward compatibility.
 */

// Re-export types from canonical location
export type { Team as OptimizedTeam, TeamMember as OptimizedTeamMember } from '@/types/team';

// Re-export functions from canonical service
export {
  getTeamMembersOptimized,
  getOrganizationTeamsOptimized,
  getTeamByIdOptimized,
  isTeamManagerOptimized as isTeamManager
} from './teamService';