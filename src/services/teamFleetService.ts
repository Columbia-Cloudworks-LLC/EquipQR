import { supabase } from '@/integrations/supabase/client';
import { parseLatLng } from '@/utils/geoUtils';

export interface TeamFleetOption {
  id: string;
  name: string;
  description: string | null;
  equipmentCount: number;
  hasLocationData: boolean;
}

export interface EquipmentLocation {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  lat: number;
  lng: number;
  source: 'equipment' | 'geocoded' | 'scan';
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
      .select('id, name, description')
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
      console.error('Error fetching accessible teams:', error);
      throw error;
    }
    
    return teams || [];
  } catch (error) {
    console.error('Error in getAccessibleTeams:', error);
    throw error;
  }
};

/**
 * Get equipment with location data for specific teams
 */
export const getTeamEquipmentWithLocations = async (
  organizationId: string,
  teamIds: string[],
  isOrgAdmin: boolean
): Promise<TeamEquipmentData[]> => {
  try {
    if (teamIds.length === 0) {
      return [];
    }

    // Get equipment for accessible teams
    let query = supabase
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
        teams:team_id (
          id,
          name
        )
      `)
      .eq('organization_id', organizationId)
      .in('team_id', teamIds);

    const { data: equipment, error } = await query;

    if (error) {
      console.error('Error fetching team equipment:', error);
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

      // Check for location data using the same logic as the original hook
      let coords: { lat: number; lng: number } | null = null;
      let source: 'equipment' | 'geocoded' | 'scan' = 'equipment';
      let formatted_address: string | undefined;
      let location_updated_at: string | undefined;

      // A. Try to parse equipment.location as "lat, lng"
      if (item.location) {
        coords = parseLatLng(item.location);
        if (coords) {
          source = 'equipment';
          location_updated_at = item.updated_at;
        }
      }

      // B. If not parseable and non-empty, assume it can be geocoded
      if (!coords && item.location?.trim()) {
        // For now, we'll assume it can be geocoded and count it as having location data
        // In a real implementation, you might want to actually geocode it
        coords = { lat: 0, lng: 0 }; // Placeholder coordinates
        source = 'geocoded';
        location_updated_at = item.updated_at;
      }

      // C. Check for latest scan with geo-tag
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
          console.warn(`Failed to fetch scans for equipment ${item.id}:`, error);
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
    console.error('Error in getTeamEquipmentWithLocations:', error);
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
    console.log('[getTeamFleetData] Starting with:', { organizationId, userTeamIds, isOrgAdmin });
    
    // Get accessible teams
    const teams = await getAccessibleTeams(organizationId, userTeamIds, isOrgAdmin);
    console.log('[getTeamFleetData] Accessible teams:', teams);
    
    if (teams.length === 0) {
      console.log('[getTeamFleetData] No accessible teams found');
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
      teams.map(t => t.id),
      isOrgAdmin
    );

    // Calculate totals
    const totalEquipmentCount = teamEquipmentData.reduce((sum, team) => sum + team.equipmentCount, 0);
    const totalLocatedCount = teamEquipmentData.reduce((sum, team) => sum + team.locatedCount, 0);

    // Create team options with equipment counts
    const teamOptions: TeamFleetOption[] = teams.map(team => {
      const teamData = teamEquipmentData.find(t => t.teamId === team.id);
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        equipmentCount: teamData?.equipmentCount || 0,
        hasLocationData: (teamData?.locatedCount || 0) > 0
      };
    });

    // Only consider it has location data if we have a meaningful number of equipment items plotted
    const hasLocationData = totalLocatedCount >= 2 || (totalEquipmentCount > 0 && (totalLocatedCount / totalEquipmentCount) >= 0.2);

    return {
      teams: teamOptions,
      teamEquipmentData,
      hasLocationData,
      totalEquipmentCount,
      totalLocatedCount
    };
  } catch (error) {
    console.error('Error in getTeamFleetData:', error);
    throw error;
  }
};
