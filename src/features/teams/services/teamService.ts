import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { 
  TeamRow, 
  TeamInsert, 
  TeamUpdate, 
  TeamMemberInsert,
  TeamMemberRole,
  Team,
  TeamMember,
  TeamWithMembers
} from '@/features/teams/types/team';
import {
  uploadImageToStorage,
  deleteImageFromStorage,
  generateSingleFilePath,
  validateImageFile,
} from '@/services/imageUploadService';

// Re-export types for backward compatibility
export type { Team, TeamMember, TeamWithMembers, TeamMemberRole };

/**
 * @deprecated Use Team from @/types/team instead
 */
export type OptimizedTeam = Team;

/**
 * @deprecated Use TeamMember from @/types/team instead
 */
export type OptimizedTeamMember = TeamMember;

// Create a new team
export const createTeam = async (teamData: TeamInsert): Promise<Team> => {
  const { data, error } = await supabase
    .from('teams')
    .insert(teamData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Create a team and automatically add creator as manager
export const createTeamWithCreator = async (
  teamData: TeamInsert, 
  creatorId: string
): Promise<TeamWithMembers> => {
  // Start a transaction-like operation
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert(teamData)
    .select()
    .single();

  if (teamError) throw teamError;

  // Add creator as manager
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: creatorId,
      role: 'manager'
    });

  if (memberError) {
    // If adding member fails, we should ideally rollback the team creation
    // For now, we'll throw the error and let the caller handle cleanup
    throw memberError;
  }

  // Return the team with the creator as a member
  const teamWithMembers: TeamWithMembers = {
    ...team,
    members: [{
      id: '', // This will be filled by the actual query
      team_id: team.id,
      user_id: creatorId,
      role: 'manager' as const,
      joined_date: new Date().toISOString(),
      profiles: null // This will be filled by actual query if needed
    }],
    member_count: 1
  };

  return teamWithMembers;
};

// Update an existing team
export const updateTeam = async (id: string, updates: TeamUpdate): Promise<Team> => {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete a team
export const deleteTeam = async (id: string): Promise<void> => {
  const { error, count } = await supabase
    .from('teams')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) throw error;
  
  // Check if the team was actually deleted
  if (count === 0) {
    throw new Error('Team could not be deleted. You may not have permission to delete this team.');
  }
};

// Get teams by organization with member details
// @deprecated Use TeamRepository.getTeamsByOrg() for better performance with optimized queries
export const getTeamsByOrganization = async (organizationId: string): Promise<TeamWithMembers[]> => {
  // First get all teams for the organization
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');

  if (teamsError) throw teamsError;
  if (!teams || teams.length === 0) return [];

  // Get all team IDs
  const teamIds = teams.map(team => team.id);

  // Get team members with profile data using a separate query
  const { data: teamMembersData, error: membersError } = await supabase
    .from('team_members')
    .select(`
      *,
      profiles (
        name,
        email
      )
    `)
    .in('team_id', teamIds);

  if (membersError) throw membersError;

  // Group members by team_id
  const membersByTeam = (teamMembersData || []).reduce((acc, member) => {
    if (!acc[member.team_id]) {
      acc[member.team_id] = [];
    }
    acc[member.team_id].push(member);
    return acc;
  }, {} as Record<string, typeof teamMembersData>);

  // Combine teams with their members
  return teams.map(team => ({
    ...team,
    members: membersByTeam[team.id] || [],
    member_count: (membersByTeam[team.id] || []).length
  }));
};

// Get single team with members
export const getTeamById = async (id: string): Promise<TeamWithMembers | null> => {
  // First get the team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single();

  if (teamError) {
    if (teamError.code === 'PGRST116') return null;
    throw teamError;
  }

  // Get team members with profile data using a separate query
  const { data: teamMembersData, error: membersError } = await supabase
    .from('team_members')
    .select(`
      *,
      profiles (
        name,
        email
      )
    `)
    .eq('team_id', id);

  if (membersError) throw membersError;

  return {
    ...team,
    members: teamMembersData || [],
    member_count: (teamMembersData || []).length
  };
};

// Add member to team
// @deprecated Use TeamRepository.addMember() for consistency
export const addTeamMember = async (teamMemberData: TeamMemberInsert): Promise<TeamMember> => {
  const { data, error } = await supabase
    .from('team_members')
    .insert(teamMemberData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Remove member from team
export const removeTeamMember = async (teamId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) throw error;
};

// Update team member role
// @deprecated Use TeamRepository.updateMemberRole() for consistency
export const updateTeamMemberRole = async (
  teamId: string, 
  userId: string, 
  role: Database['public']['Enums']['team_member_role']
): Promise<TeamMember> => {
  const { data, error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get available users for team (organization members not in team)
export const getAvailableUsersForTeam = async (organizationId: string, teamId: string) => {
  // First get all users already in the team
  const { data: existingMembers, error: membersError } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId);

  if (membersError) throw membersError;

  const existingUserIds = existingMembers?.map(member => member.user_id) || [];

  // Then get organization members excluding those already in the team
  let query = supabase
    .from('organization_members')
    .select(`
      user_id,
      profiles!inner (
        id,
        name,
        email
      )
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  // Only add the not-in filter if there are existing members
  if (existingUserIds.length > 0) {
    query = query.not('user_id', 'in', `(${existingUserIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

// Check if user is team manager
// @deprecated Use TeamRepository.isTeamManager() for better performance with optimized queries
export const isTeamManager = async (userId: string, teamId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .eq('role', 'manager')
    .maybeSingle();

  if (error) throw error;
  return !!data;
};

// Get teams user manages
export const getTeamsUserManages = async (userId: string): Promise<TeamRow[]> => {
  // First get team IDs where user is manager
  const { data: teamMemberships, error: memberError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .eq('role', 'manager');

  if (memberError) throw memberError;
  
  if (!teamMemberships || teamMemberships.length === 0) {
    return [];
  }

  const teamIds = teamMemberships.map(tm => tm.team_id);
  
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .in('id', teamIds);

  if (error) throw error;
  return data || [];
};

// ============================================
// Optimized Query Functions (merged from optimizedTeamService)
// ============================================

/**
 * Get team members with profile information using optimized query
 * Uses idx_team_members_team_id index
 */
export const getTeamMembersOptimized = async (teamId: string): Promise<TeamMember[]> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        profiles!team_members_user_id_fkey (
          name,
          email
        )
      `)
      .eq('team_id', teamId)
      .order('joined_date', { ascending: true });

    if (error) throw error;

    return (data || []).map(member => ({
      id: member.id,
      user_id: member.user_id,
      team_id: member.team_id,
      role: member.role,
      joined_date: member.joined_date,
      user_name: member.profiles?.name,
      user_email: member.profiles?.email
    }));
  } catch (error) {
    logger.error('Error fetching team members:', error);
    return [];
  }
};

/**
 * Get teams by organization with member counts using optimized query
 */
export const getOrganizationTeamsOptimized = async (organizationId: string): Promise<Team[]> => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(count)
      `)
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(team => ({
      id: team.id,
      name: team.name,
      description: team.description,
      organization_id: team.organization_id,
      member_count: team.team_members?.[0]?.count || 0,
      created_at: team.created_at,
      updated_at: team.updated_at,
      image_url: (team as TeamRow).image_url,
      location_address: team.location_address,
      location_city: team.location_city,
      location_state: team.location_state,
      location_country: team.location_country,
      location_lat: team.location_lat,
      location_lng: team.location_lng,
      override_equipment_location: team.override_equipment_location,
    }));
  } catch (error) {
    logger.error('Error fetching organization teams:', error);
    return [];
  }
};

/**
 * Get a single team by ID with member count using optimized query
 */
export const getTeamByIdOptimized = async (teamId: string): Promise<Team | null> => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(count)
      `)
      .eq('id', teamId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      organization_id: data.organization_id,
      member_count: data.team_members?.[0]?.count || 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
      image_url: (data as unknown as TeamRow).image_url,
      location_address: data.location_address,
      location_city: data.location_city,
      location_state: data.location_state,
      location_country: data.location_country,
      location_lat: data.location_lat,
      location_lng: data.location_lng,
      override_equipment_location: data.override_equipment_location,
    };
  } catch (error) {
    logger.error('Error fetching team by ID:', error);
    return null;
  }
};

/**
 * Check if user is team manager using optimized query
 * Uses idx_team_members_user_team index
 */
export const isTeamManagerOptimized = async (userId: string, teamId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('role', 'manager')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  } catch (error) {
    logger.error('Error checking team manager status:', error);
    return false;
  }
};

// ============================================
// Team Image Functions
// ============================================

/**
 * Upload a team image to Supabase Storage and update the teams table.
 * Returns the public URL of the uploaded image.
 */
export const uploadTeamImage = async (
  teamId: string,
  organizationId: string,
  file: File
): Promise<string> => {
  validateImageFile(file, 5);

  const filePath = generateSingleFilePath(`${organizationId}/${teamId}`, 'image', file);
  const publicUrl = await uploadImageToStorage(
    'team-images',
    filePath,
    file,
    { upsert: true }
  );

  const { error } = await supabase
    .from('teams')
    .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', teamId)
    .eq('organization_id', organizationId);

  if (error) {
    logger.error('Error updating team image in DB:', error);
    // Clean up orphaned storage file since DB update failed
    try {
      await deleteImageFromStorage('team-images', publicUrl);
    } catch (deleteError) {
      logger.error('Failed to delete orphaned team image from storage:', deleteError);
    }
    throw new Error('Failed to save team image');
  }

  return publicUrl;
};

/**
 * Delete the team image from storage and clear the column.
 */
export const deleteTeamImage = async (
  teamId: string,
  organizationId: string,
  currentImageUrl: string
): Promise<void> => {
  await deleteImageFromStorage('team-images', currentImageUrl);

  const { error } = await supabase
    .from('teams')
    .update({ image_url: null, updated_at: new Date().toISOString() })
    .eq('id', teamId)
    .eq('organization_id', organizationId);

  if (error) {
    logger.error('Error clearing team image:', error);
    throw new Error('Failed to remove team image');
  }
};