import { 
  getOrganizationTeamsOptimized, 
  getTeamMembersOptimized, 
  getTeamByIdOptimized,
  isTeamManagerOptimized,
  addTeamMember, 
  updateTeamMemberRole, 
  createTeamWithCreator as createTeamWithCreatorService,
  deleteTeam as deleteTeamService,
  updateTeam as updateTeamService
} from '@/features/teams/services/teamService';
import type { 
  TeamWithMembers,
  TeamMember,
  TeamMemberInsert,
  TeamMemberRole,
  TeamInsert,
  TeamUpdate
} from '@/features/teams/types/team';

// Re-export for backward compatibility
export type { TeamMember as OptimizedTeamMember };

/**
 * Unified Team Repository using optimized queries for better performance
 * Provides a single interface for all team-related operations
 */
export class TeamRepository {
  /**
   * Get teams by organization ID using optimized query with member counts
   * Converts OptimizedTeam to TeamWithMembers format for compatibility
   */
  static async getTeamsByOrg(orgId: string): Promise<TeamWithMembers[]> {
    const optimizedTeams = await getOrganizationTeamsOptimized(orgId);
    
    // For each team, get basic member data for previews
    const teamsWithMembers = await Promise.all(
      optimizedTeams.map(async (team) => {
        const members = await getTeamMembersOptimized(team.id);
        // Convert OptimizedTeamMember to expected format
        const formattedMembers = members.map(member => ({
          id: member.id,
          team_id: member.team_id,
          user_id: member.user_id,
          role: member.role as TeamMemberRole,
          joined_date: member.joined_date,
          profiles: {
            name: member.user_name || 'Unknown User',
            email: member.user_email || 'No email'
          }
        }));
        
        return {
          ...team,
          members: formattedMembers,
          member_count: team.member_count
        };
      })
    );
    
    return teamsWithMembers;
  }

  /**
   * Get team by ID with members
   */
  static async getTeamById(teamId: string): Promise<TeamWithMembers | null> {
    const team = await getTeamByIdOptimized(teamId);
    if (!team) return null;

    const members = await getTeamMembersOptimized(teamId);
    const formattedMembers = members.map(member => ({
      id: member.id,
      team_id: member.team_id,
      user_id: member.user_id,
      role: member.role as TeamMemberRole,
      joined_date: member.joined_date,
      profiles: {
        name: member.user_name || 'Unknown User',
        email: member.user_email || 'No email'
      }
    }));

    return {
      ...team,
      members: formattedMembers,
      member_count: team.member_count
    };
  }

  /**
   * Get team members with profile information using optimized query
   */
  static async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return getTeamMembersOptimized(teamId);
  }

  /**
   * Add a member to a team with specified role
   */
  static async addMember(teamId: string, userId: string, role: TeamMemberRole) {
    const memberData: TeamMemberInsert = {
      team_id: teamId,
      user_id: userId,
      role: role
    };
    return addTeamMember(memberData);
  }

  /**
   * Update a team member's role
   */
  static async updateMemberRole(teamId: string, userId: string, role: TeamMemberRole) {
    return updateTeamMemberRole(teamId, userId, role);
  }

  /**
   * Check if a user is a team manager using optimized query
   */
  static async isTeamManager(userId: string, teamId: string): Promise<boolean> {
    return isTeamManagerOptimized(userId, teamId);
  }

  /**
   * Create a team with creator as manager
   */
  static async createTeamWithCreator(teamData: TeamInsert, creatorId: string) {
    return createTeamWithCreatorService(teamData, creatorId);
  }

  /**
   * Delete a team
   */
  static async deleteTeam(teamId: string): Promise<void> {
    return deleteTeamService(teamId);
  }

  /**
   * Update team information
   */
  static async updateTeam(teamId: string, updates: TeamUpdate) {
    return updateTeamService(teamId, updates);
  }
}

export default TeamRepository;