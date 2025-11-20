import { logger } from '../utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { getAccessibleEquipmentIds } from './EquipmentService';

export interface TeamBasedDashboardStats {
  totalEquipment: number;
  activeEquipment: number;
  maintenanceEquipment: number;
  inactiveEquipment: number;
  totalWorkOrders: number;
  openWorkOrders: number;
  overdueWorkOrders: number;
  completedWorkOrders: number;
  totalTeams: number;
}

export const getTeamBasedDashboardStats = async (
  organizationId: string,
  userTeamIds: string[],
  isOrgAdmin: boolean = false
): Promise<TeamBasedDashboardStats> => {
  try {
    // If user has no team access and isn't admin, return empty stats
    if (!isOrgAdmin && userTeamIds.length === 0) {
      return {
        totalEquipment: 0,
        activeEquipment: 0,
        maintenanceEquipment: 0,
        inactiveEquipment: 0,
        totalWorkOrders: 0,
        openWorkOrders: 0,
        overdueWorkOrders: 0,
        completedWorkOrders: 0,
        totalTeams: 0,
      };
    }

    // Get accessible equipment IDs
    const accessibleEquipmentIds = await getAccessibleEquipmentIds(organizationId, userTeamIds, isOrgAdmin);

    // Equipment stats
    let equipmentQuery = supabase
      .from('equipment')
      .select('status')
      .eq('organization_id', organizationId);

    if (!isOrgAdmin && accessibleEquipmentIds.length > 0) {
      equipmentQuery = equipmentQuery.in('id', accessibleEquipmentIds);
    } else if (!isOrgAdmin) {
      // No accessible equipment
      equipmentQuery = equipmentQuery.eq('id', 'non-existent-id');
    }

    const { data: equipmentData, error: equipmentError } = await equipmentQuery;

    if (equipmentError) {
      logger.error('Error fetching equipment stats:', equipmentError);
      throw equipmentError;
    }

    const equipmentStats = {
      totalEquipment: equipmentData?.length || 0,
      activeEquipment: equipmentData?.filter(e => e.status === 'active').length || 0,
      maintenanceEquipment: equipmentData?.filter(e => e.status === 'maintenance').length || 0,
      inactiveEquipment: equipmentData?.filter(e => e.status === 'inactive').length || 0,
    };

    // Work order stats
    let workOrderQuery = supabase
      .from('work_orders')
      .select('status, due_date')
      .eq('organization_id', organizationId);

    if (!isOrgAdmin && accessibleEquipmentIds.length > 0) {
      workOrderQuery = workOrderQuery.in('equipment_id', accessibleEquipmentIds);
    } else if (!isOrgAdmin) {
      // No accessible work orders
      workOrderQuery = workOrderQuery.eq('equipment_id', 'non-existent-id');
    }

    const { data: workOrderData, error: workOrderError } = await workOrderQuery;

    if (workOrderError) {
      logger.error('Error fetching work order stats:', workOrderError);
      throw workOrderError;
    }

    const now = new Date();
    const workOrderStats = {
      totalWorkOrders: workOrderData?.length || 0,
      openWorkOrders: workOrderData?.filter(wo => 
        ['submitted', 'accepted', 'assigned', 'in_progress', 'on_hold'].includes(wo.status)
      ).length || 0,
      overdueWorkOrders: workOrderData?.filter(wo => 
        wo.due_date && new Date(wo.due_date) < now && 
        !['completed', 'cancelled'].includes(wo.status)
      ).length || 0,
      completedWorkOrders: workOrderData?.filter(wo => wo.status === 'completed').length || 0,
    };

    // Team stats - user can see teams they're a member of (or all if admin)
    let teamQuery = supabase
      .from('teams')
      .select('id')
      .eq('organization_id', organizationId);

    if (!isOrgAdmin && userTeamIds.length > 0) {
      teamQuery = teamQuery.in('id', userTeamIds);
    } else if (!isOrgAdmin) {
      // No accessible teams
      teamQuery = teamQuery.eq('id', 'non-existent-id');
    }

    const { data: teamData, error: teamError } = await teamQuery;

    if (teamError) {
      logger.error('Error fetching team stats:', teamError);
      throw teamError;
    }

    const teamStats = {
      totalTeams: teamData?.length || 0,
    };

    const stats = {
      ...equipmentStats,
      ...workOrderStats,
      ...teamStats,
    };

    return stats;

  } catch (error) {
    logger.error('Error in getTeamBasedDashboardStats:', error);
    throw error;
  }
};