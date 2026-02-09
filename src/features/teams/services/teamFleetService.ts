import { supabase } from '@/integrations/supabase/client';
import { parseLatLng } from '@/utils/geoUtils';
import { logger } from '@/utils/logger';

export interface TeamFleetOption {
  id: string;
  name: string;
  description: string | null;
  equipmentCount: number;
  hasLocationData: boolean;
  /** Team HQ location coordinates (if set) */
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
}

export interface EquipmentLocation {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  lat: number;
  lng: number;
  source: 'equipment' | 'geocoded' | 'scan' | 'team';
  formatted_address?: string;
  working_hours?: number;
  last_maintenance?: string;
  image_url?: string;
  location_updated_at?: string;
  team_id: string | null;
  team_name?: string;
}

export interface TeamEquipmentData {
  teamId: string;
  teamName: string;
  equipment: EquipmentLocation[];
  equipmentCount: number;
  locatedCount: number;
}

export interface TeamFleetData {
  teams: TeamFleetOption[];
  teamEquipmentData: TeamEquipmentData[];
  hasLocationData: boolean;
  totalEquipmentCount: number;
  totalLocatedCount: number;
}

/**
 * Get teams that the user has access to based on their role and team memberships
 */
export const getAccessibleTeams = async (
  organizationId: string, 
  userTeamIds: string[], 
  isOrgAdmin: boolean
): Promise<TeamFleetOption[]> => {
  try {
    let query = supabase
      .from('teams')
      .select('id, name, description, location_lat, location_lng, location_address, location_city, location_state, location_country')
      .eq('organization_id', organizationId);
    
    // Non-admin users only see teams they're members of
    if (!isOrgAdmin && userTeamIds.length > 0) {
      query = query.in('id', userTeamIds);
    } else if (!isOrgAdmin && userTeamIds.length === 0) {
      // Users with no team memberships see no teams
      return [];
    }
    
    const { data: teams, error } = await query.order('name');
    
    if (error) {
      logger.error('Error fetching accessible teams', error);
      throw error;
    }
    
    return teams || [];
  } catch (error) {
    logger.error('Error in getAccessibleTeams', error);
    throw error;
  }
};

/**
 * Get equipment with location data for specific teams
 */
export const getTeamEquipmentWithLocations = async (
  organizationId: string,
  teamIds: string[]
): Promise<TeamEquipmentData[]> => {
  try {
    // Get all equipment in the organization (team-assigned + unassigned)
    let queryBuilder = supabase
      .from('equipment')
      .select(`
        id,
        name,
        manufacturer,
        model,
        serial_number,
        location,
        working_hours,
        last_maintenance,
        image_url,
        updated_at,
        team_id,
        assigned_location_lat,
        assigned_location_lng,
        assigned_location_street,
        assigned_location_city,
        assigned_location_state,
        assigned_location_country,
        teams:team_id (
          id,
          name,
          location_lat,
          location_lng,
          location_address,
          location_city,
          location_state,
          location_country,
          override_equipment_location
        )
      `)
      .eq('organization_id', organizationId);

    // Filter by team IDs + unassigned, or just unassigned if no teams
    if (teamIds.length > 0) {
      queryBuilder = queryBuilder.or(`team_id.in.(${teamIds.join(',')}),team_id.is.null`);
    } else {
      queryBuilder = queryBuilder.is('team_id', null);
    }

    const { data: equipment, error } = await queryBuilder;

    if (error) {
      logger.error('Error fetching team equipment', error);
      throw error;
    }

    if (!equipment || equipment.length === 0) {
      return [];
    }

    // Process equipment to find location data
    const teamEquipmentMap = new Map<string, TeamEquipmentData>();

    for (const item of equipment) {
      const teamId = item.team_id || 'unassigned';
      const teamName = item.teams?.name || 'Unassigned';
      
      if (!teamEquipmentMap.has(teamId)) {
        teamEquipmentMap.set(teamId, {
          teamId,
          teamName,
          equipment: [],
          equipmentCount: 0,
          locatedCount: 0
        });
      }

      const teamData = teamEquipmentMap.get(teamId)!;
      teamData.equipmentCount++;

      // Helper function to format address components
      const formatAddress = (parts: {
        street?: string | null;
        city?: string | null;
        state?: string | null;
        country?: string | null;
      }): string | undefined => {
        const components = [parts.street, parts.city, parts.state, parts.country]
          .filter(Boolean);
        return components.length > 0 ? components.join(', ') : undefined;
      };

      // Check for location data using 3-tier hierarchy
      let coords: { lat: number; lng: number } | null = null;
      let source: 'equipment' | 'geocoded' | 'scan' | 'team' = 'equipment';
      let formatted_address: string | undefined;
      let location_updated_at: string | undefined;

      const team = item.teams;

      // 1. Team Override: If team has override enabled and coordinates
      if (
        team?.override_equipment_location &&
        team.location_lat != null &&
        team.location_lng != null
      ) {
        coords = {
          lat: team.location_lat,
          lng: team.location_lng
        };
        source = 'team';
        formatted_address = formatAddress({
          street: team.location_address,
          city: team.location_city,
          state: team.location_state,
          country: team.location_country,
        });
        location_updated_at = item.updated_at;
      }

      // 2. Manual Assignment: If equipment has assigned location coordinates
      if (!coords && item.assigned_location_lat != null && item.assigned_location_lng != null) {
        coords = {
          lat: item.assigned_location_lat,
          lng: item.assigned_location_lng
        };
        source = 'equipment';
        formatted_address = formatAddress({
          street: item.assigned_location_street,
          city: item.assigned_location_city,
          state: item.assigned_location_state,
          country: item.assigned_location_country,
        });
        location_updated_at = item.updated_at;
      }

      // 3. Legacy location field: Try to parse equipment.location as "lat, lng"
      if (!coords && item.location) {
        coords = parseLatLng(item.location);
        if (coords) {
          source = 'equipment';
          location_updated_at = item.updated_at;
        }
      }

      // 4. Last Scan: Check for latest scan with geo-tag
      if (!coords) {
        try {
          const { data: scans, error: scansError } = await supabase
            .from('scans')
            .select('location, scanned_at')
            .eq('equipment_id', item.id)
            .not('location', 'is', null)
            .order('scanned_at', { ascending: false })
            .limit(1);

          if (!scansError && scans && scans.length > 0 && scans[0].location) {
            coords = parseLatLng(scans[0].location);
            if (coords) {
              source = 'scan';
              location_updated_at = scans[0].scanned_at;
            }
          }
        } catch (error) {
          logger.warn(`Failed to fetch scans for equipment ${item.id}`, error);
        }
      }

      // If we have coordinates, add to team equipment
      if (coords) {
        teamData.locatedCount++;
        teamData.equipment.push({
          id: item.id,
          name: item.name,
          manufacturer: item.manufacturer,
          model: item.model,
          serial_number: item.serial_number,
          lat: coords.lat,
          lng: coords.lng,
          source,
          formatted_address,
          working_hours: item.working_hours,
          last_maintenance: item.last_maintenance,
          image_url: item.image_url,
          location_updated_at,
          team_id: item.team_id,
          team_name: teamName
        });
      }
    }

    return Array.from(teamEquipmentMap.values());
  } catch (error) {
    logger.error('Error in getTeamEquipmentWithLocations', error);
    throw error;
  }
};

/**
 * Get complete team fleet data with access control
 */
export const getTeamFleetData = async (
  organizationId: string,
  userTeamIds: string[],
  isOrgAdmin: boolean
): Promise<TeamFleetData> => {
  try {
    // Get accessible teams
    const teams = await getAccessibleTeams(organizationId, userTeamIds, isOrgAdmin);
    
    if (teams.length === 0) {
      return {
        teams: [],
        teamEquipmentData: [],
        hasLocationData: false,
        totalEquipmentCount: 0,
        totalLocatedCount: 0
      };
    }

    // Get equipment data for accessible teams
    const teamEquipmentData = await getTeamEquipmentWithLocations(
      organizationId,
      teams.map(t => t.id)
    );

    // Calculate totals
    const totalEquipmentCount = teamEquipmentData.reduce((sum, team) => sum + team.equipmentCount, 0);
    const totalLocatedCount = teamEquipmentData.reduce((sum, team) => sum + team.locatedCount, 0);

    // Create team options with equipment counts and HQ location
    const teamOptions: TeamFleetOption[] = teams.map(team => {
      const teamData = teamEquipmentData.find(t => t.teamId === team.id);
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        equipmentCount: teamData?.equipmentCount || 0,
        hasLocationData: (teamData?.locatedCount || 0) > 0,
        location_lat: team.location_lat,
        location_lng: team.location_lng,
        location_address: team.location_address,
        location_city: team.location_city,
        location_state: team.location_state,
        location_country: team.location_country,
      };
    });

    // Add "Unassigned" option if there's unassigned equipment
    const unassignedData = teamEquipmentData.find(t => t.teamId === 'unassigned');
    if (unassignedData && unassignedData.equipmentCount > 0) {
      teamOptions.push({
        id: 'unassigned',
        name: 'Unassigned',
        description: 'Equipment not assigned to any team',
        equipmentCount: unassignedData.equipmentCount,
        hasLocationData: unassignedData.locatedCount > 0,
      });
    }

    // Show map if we have at least one item with location data OR any team has an HQ location
    const anyTeamHasHQ = teamOptions.some(t => t.location_lat != null && t.location_lng != null);
    const hasLocationData = totalLocatedCount > 0 || anyTeamHasHQ;

    return {
      teams: teamOptions,
      teamEquipmentData,
      hasLocationData,
      totalEquipmentCount,
      totalLocatedCount
    };
  } catch (error) {
    logger.error('Error in getTeamFleetData', error);
    throw error;
  }
};
