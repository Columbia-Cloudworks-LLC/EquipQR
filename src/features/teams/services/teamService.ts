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
import { isTeamView } from '@/features/teams/types/team';
import {
  uploadImageToStorage,
  resolveImageDisplayUrl,
  batchResolveTeamImageDisplayUrls,
  displayUrlForStoredPrivateImage,
  deleteImageFromStorage,
  generateSingleFilePath,
  validateImageFile,
} from '@/services/imageUploadService';

// Re-export types for backward compatibility
export type { Team, TeamMember, TeamWithMembers };

type TeamCustomerJoin = {
  name: string;
  status: string;
  quickbooks_synced_at: string | null;
} | null;

function toTeam(
  row: Pick<
    TeamRow,
    | 'id'
    | 'name'
    | 'description'
    | 'organization_id'
    | 'created_at'
    | 'updated_at'
    | 'image_url'
    | 'location_address'
    | 'location_city'
    | 'location_state'
    | 'location_country'
    | 'location_lat'
    | 'location_lng'
    | 'override_equipment_location'
    | 'preferred_view'
    | 'customer_id'
    | 'team_lead_id'
  > & { team_members?: Array<{ count: number }> | null },
  extras?: {
    image_url?: string | null;
    customer?: TeamCustomerJoin;
  },
): Team {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    organization_id: row.organization_id,
    member_count: row.team_members?.[0]?.count || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    image_url: extras?.image_url ?? row.image_url,
    location_address: row.location_address ?? undefined,
    location_city: row.location_city ?? undefined,
    location_state: row.location_state ?? undefined,
    location_country: row.location_country ?? undefined,
    location_lat: row.location_lat ?? undefined,
    location_lng: row.location_lng ?? undefined,
    override_equipment_location: row.override_equipment_location,
    preferred_view: isTeamView(row.preferred_view) ? row.preferred_view : 'internal',
    customer_id: row.customer_id,
    customer_name: extras?.customer?.name ?? null,
    customer_status: extras?.customer?.status ?? null,
    quickbooks_synced_at: extras?.customer?.quickbooks_synced_at ?? null,
    team_lead_id: row.team_lead_id,
  };
}

export const getTeamImageUrl = async (
  teamId: string,
  organizationId: string,
): Promise<string | null> => {
  const { data, error } = await supabase
    .from('teams')
    .select('image_url')
    .eq('id', teamId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) throw error;
  return data?.image_url ?? null;
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
export const updateTeam = async (
  id: string,
  updates: TeamUpdate,
  organizationId: string,
): Promise<Team> => {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select(`
      *,
      team_members(count)
    `)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) {
    throw new Error('Team could not be updated. You may not have permission to edit this team.');
  }
  return toTeam(data);
};

// Delete a team
export const deleteTeam = async (id: string, organizationId: string): Promise<void> => {
  const { error, count } = await supabase
    .from('teams')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('organization_id', organizationId);

  if (error) throw error;
  
  // Check if the team was actually deleted
  if (count === 0) {
    throw new Error('Team could not be deleted. You may not have permission to delete this team.');
  }
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
  role: TeamMemberRole
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
      user_name: member.profiles?.name ?? undefined,
      user_email: member.profiles?.email ?? undefined,
    }));
  } catch (error) {
    logger.error('Error fetching team members:', error);
    return [];
  }
};

/**
 * Batch-fetch members for many teams in a single round-trip.
 *
 * The repository previously called `getTeamMembersOptimized` once per team
 * via `Promise.all`, which produced N parallel HTTPS requests on Slow 4G.
 * This helper folds the same data into one PostgREST query and groups it
 * client-side, keyed by `team_id`.
 *
 * Returns a `Map<teamId, TeamMember[]>` so callers can look up each team's
 * members without filtering the full array.
 */
export const getTeamMembersByTeamIdsOptimized = async (
  organizationId: string,
  teamIds: string[],
): Promise<Map<string, TeamMember[]>> => {
  const result = new Map<string, TeamMember[]>();
  if (teamIds.length === 0) return result;

  try {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        id,
        user_id,
        team_id,
        role,
        joined_date,
        profiles!team_members_user_id_fkey (
          name,
          email
        ),
        teams!inner (
          organization_id
        )
      `)
      .eq('teams.organization_id', organizationId)
      .in('team_id', teamIds)
      .order('joined_date', { ascending: true });

    if (error) throw error;

    for (const member of data || []) {
      const teamId = member.team_id as string;
      const list = result.get(teamId);
      const mapped: TeamMember = {
        id: member.id,
        user_id: member.user_id,
        team_id: teamId,
        role: member.role,
        joined_date: member.joined_date,
        user_name: member.profiles?.name ?? undefined,
        user_email: member.profiles?.email ?? undefined,
      };
      if (list) {
        list.push(mapped);
      } else {
        result.set(teamId, [mapped]);
      }
    }

    // Ensure every requested team appears in the map even when it has no members.
    for (const teamId of teamIds) {
      if (!result.has(teamId)) result.set(teamId, []);
    }

    return result;
  } catch (error) {
    logger.error('Error fetching batched team members:', error);
    return result;
  }
};

/**
 * Get teams by organization with member counts and customer data using optimized query
 */
export const getOrganizationTeamsOptimized = async (organizationId: string): Promise<Team[]> => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(count),
        customers(id, name, status, quickbooks_synced_at)
      `)
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) throw error;

    const teams = data || [];
    const rawImages = teams.map(t => (t as TeamRow).image_url ?? null);
    const signedBatch = await batchResolveTeamImageDisplayUrls(rawImages);

    return teams.map((team, i) => {
      const customer = (team as Record<string, unknown>).customers as TeamCustomerJoin;
      const rawImage = (team as TeamRow).image_url;
      return toTeam(team, {
        image_url: displayUrlForStoredPrivateImage(signedBatch[i], rawImage),
        customer,
      });
    });
  } catch (error) {
    logger.error('Error fetching organization teams:', error);
    return [];
  }
};

/**
 * Get a single team by ID with member count and customer data using optimized query.
 * Always scoped to the caller's current organization so dual-org members cannot
 * open another org's team UUID in the current workspace (RT-13).
 */
export const getTeamByIdOptimized = async (
  teamId: string,
  organizationId: string,
): Promise<Team | null> => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(count),
        customers(id, name, status, quickbooks_synced_at)
      `)
      .eq('id', teamId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    if (!data) return null;

    const customer = (data as Record<string, unknown>).customers as TeamCustomerJoin;

    const rawImage = (data as unknown as TeamRow).image_url;
    const [signedForTeam] = await batchResolveTeamImageDisplayUrls(rawImage ? [rawImage] : []);

    return toTeam(data, {
      image_url: displayUrlForStoredPrivateImage(signedForTeam, rawImage),
      customer,
    });
  } catch (error) {
    logger.error('Error fetching team by ID:', error);
    return null;
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
  const storedPath = await uploadImageToStorage(
    'team-images',
    filePath,
    file,
    { upsert: true }
  );

  const { error } = await supabase
    .from('teams')
    .update({ image_url: storedPath, updated_at: new Date().toISOString() })
    .eq('id', teamId)
    .eq('organization_id', organizationId);

  if (error) {
    logger.error('Error updating team image in DB:', error);
    // Clean up orphaned storage file since DB update failed
    try {
      await deleteImageFromStorage('team-images', storedPath);
    } catch (deleteError) {
      logger.error('Failed to delete orphaned team image from storage:', deleteError);
    }
    throw new Error('Failed to save team image');
  }

  const displayUrl = displayUrlForStoredPrivateImage(
    await resolveImageDisplayUrl('team-images', storedPath),
    storedPath,
  );
  if (displayUrl == null) {
    logger.error('Could not sign team image URL after upload', { teamId, storedPath });
    throw new Error('Could not generate a secure link for the team image. Try again.');
  }
  return displayUrl;
};

/**
 * Delete the team image from storage and clear the column.
 */
export const deleteTeamImage = async (
  teamId: string,
  organizationId: string,
  currentImageUrl: string
): Promise<void> => {
  // Clear DB reference first so team never points at a missing file
  const { error } = await supabase
    .from('teams')
    .update({ image_url: null, updated_at: new Date().toISOString() })
    .eq('id', teamId)
    .eq('organization_id', organizationId);

  if (error) {
    logger.error('Error clearing team image:', error);
    throw new Error('Failed to remove team image');
  }

  // Best-effort storage cleanup — DB column is already cleared
  try {
    await deleteImageFromStorage('team-images', currentImageUrl);
  } catch (storageError) {
    logger.error('Failed to delete team image from storage (best-effort):', storageError);
  }
};