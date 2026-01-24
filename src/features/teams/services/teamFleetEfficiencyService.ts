import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface FleetEfficiencyPoint {
  teamId: string;
  teamName: string;
  equipmentCount: number;
  activeWorkOrdersCount: number;
}

interface FleetEfficiencyRpcRow {
  team_id: string;
  team_name: string;
  equipment_count: number;
  active_work_orders_count: number;
}

export const getFleetEfficiency = async (
  organizationId: string,
  userTeamIds: string[],
  isOrgAdmin: boolean
): Promise<FleetEfficiencyPoint[]> => {
  try {
    if (!isOrgAdmin && userTeamIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase.rpc('get_fleet_efficiency', {
      p_org_id: organizationId,
      p_team_ids: isOrgAdmin ? null : userTeamIds
    });

    if (error) {
      logger.error('Error fetching fleet efficiency data', error);
      throw error;
    }

    return (data as FleetEfficiencyRpcRow[] | null || []).map((row) => ({
      teamId: row.team_id,
      teamName: row.team_name,
      equipmentCount: row.equipment_count,
      activeWorkOrdersCount: row.active_work_orders_count
    }));
  } catch (error) {
    logger.error('Error in getFleetEfficiency', error);
    throw error;
  }
};
