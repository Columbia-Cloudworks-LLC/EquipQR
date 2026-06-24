import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import type { SelectedTeamId } from '@/contexts/selected-team-context';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';
import {
  applySelectedTeamFilter,
  isAllTeamsScope,
  resolveDashboardEquipmentIdScope,
  type DashboardEquipmentIdScope,
} from '@/features/dashboard/utils/dashboardTeamScope';

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

const EMPTY_STATS: TeamBasedDashboardStats = {
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

function aggregateEquipmentStats(
  equipmentData: { status: string | null }[] | null | undefined,
): Pick<
  TeamBasedDashboardStats,
  'totalEquipment' | 'activeEquipment' | 'maintenanceEquipment' | 'inactiveEquipment'
> {
  return {
    totalEquipment: equipmentData?.length || 0,
    activeEquipment: equipmentData?.filter((e) => e.status === 'active').length || 0,
    maintenanceEquipment: equipmentData?.filter((e) => e.status === 'maintenance').length || 0,
    inactiveEquipment: equipmentData?.filter((e) => e.status === 'inactive').length || 0,
  };
}

function aggregateWorkOrderStats(
  workOrderData: { status: string; due_date: string | null }[] | null | undefined,
): Pick<
  TeamBasedDashboardStats,
  'totalWorkOrders' | 'openWorkOrders' | 'overdueWorkOrders' | 'completedWorkOrders'
> {
  const now = new Date();
  return {
    totalWorkOrders: workOrderData?.length || 0,
    openWorkOrders:
      workOrderData?.filter((wo) =>
        ['submitted', 'accepted', 'assigned', 'in_progress', 'on_hold'].includes(wo.status),
      ).length || 0,
    overdueWorkOrders:
      workOrderData?.filter(
        (wo) =>
          wo.due_date &&
          new Date(wo.due_date) < now &&
          !['completed', 'cancelled'].includes(wo.status),
      ).length || 0,
    completedWorkOrders: workOrderData?.filter((wo) => wo.status === 'completed').length || 0,
  };
}

async function fetchEquipmentStatsForScope(
  organizationId: string,
  userTeamIds: string[],
  isOrgAdmin: boolean,
  selectedTeamId: SelectedTeamId | undefined,
  equipmentScope: DashboardEquipmentIdScope,
): Promise<
  Pick<
    TeamBasedDashboardStats,
    'totalEquipment' | 'activeEquipment' | 'maintenanceEquipment' | 'inactiveEquipment'
  >
> {
  if (equipmentScope.type === 'none') {
    return aggregateEquipmentStats([]);
  }

  let equipmentQuery = supabase.from('equipment').select('status').eq('organization_id', organizationId);

  if (equipmentScope.type === 'ids') {
    equipmentQuery = equipmentQuery.in('id', equipmentScope.ids);
  } else if (!isOrgAdmin) {
    if (userTeamIds.length === 0) {
      return aggregateEquipmentStats([]);
    }
    equipmentQuery = equipmentQuery.in('team_id', userTeamIds);
  } else if (!isAllTeamsScope(selectedTeamId)) {
    equipmentQuery = applySelectedTeamFilter(equipmentQuery, selectedTeamId);
  }

  const { data: equipmentData, error: equipmentError } = await equipmentQuery;
  if (equipmentError) {
    logger.error('Error fetching equipment stats:', equipmentError);
    throw equipmentError;
  }

  return aggregateEquipmentStats(equipmentData);
}

async function fetchWorkOrderStatsForScope(
  organizationId: string,
  userTeamIds: string[],
  isOrgAdmin: boolean,
  selectedTeamId: SelectedTeamId | undefined,
  equipmentScope: DashboardEquipmentIdScope,
): Promise<
  Pick<
    TeamBasedDashboardStats,
    'totalWorkOrders' | 'openWorkOrders' | 'overdueWorkOrders' | 'completedWorkOrders'
  >
> {
  if (equipmentScope.type === 'none') {
    return aggregateWorkOrderStats([]);
  }

  let workOrderQuery = supabase
    .from('work_orders')
    .select('status, due_date')
    .eq('organization_id', organizationId)
    .not('equipment_id', 'is', null);

  const needsEquipmentScope =
    equipmentScope.type === 'ids' || !isOrgAdmin || !isAllTeamsScope(selectedTeamId);

  if (needsEquipmentScope) {
    let resolvedIds: string[];
    if (equipmentScope.type === 'ids') {
      resolvedIds = equipmentScope.ids;
    } else {
      const result = await EquipmentService.getAccessibleEquipmentIds(
        organizationId,
        userTeamIds,
        isOrgAdmin,
      );
      resolvedIds = result.success && result.data ? result.data : [];
    }

    if (resolvedIds.length === 0) {
      return aggregateWorkOrderStats([]);
    }
    workOrderQuery = workOrderQuery.in('equipment_id', resolvedIds);
  }

  const { data: workOrderData, error: workOrderError } = await workOrderQuery;
  if (workOrderError) {
    logger.error('Error fetching work order stats:', workOrderError);
    throw workOrderError;
  }

  return aggregateWorkOrderStats(workOrderData);
}

export const getTeamBasedDashboardStats = async (
  organizationId: string,
  userTeamIds: string[],
  isOrgAdmin: boolean = false,
  selectedTeamId: SelectedTeamId | undefined = null,
): Promise<TeamBasedDashboardStats> => {
  try {
    if (!isOrgAdmin && userTeamIds.length === 0) {
      return EMPTY_STATS;
    }

    const equipmentScope = await resolveDashboardEquipmentIdScope(
      organizationId,
      selectedTeamId,
      userTeamIds,
      isOrgAdmin,
    );

    const [equipmentStats, workOrderStats] = await Promise.all([
      fetchEquipmentStatsForScope(
        organizationId,
        userTeamIds,
        isOrgAdmin,
        selectedTeamId,
        equipmentScope,
      ),
      fetchWorkOrderStatsForScope(
        organizationId,
        userTeamIds,
        isOrgAdmin,
        selectedTeamId,
        equipmentScope,
      ),
    ]);

    let teamQuery = supabase.from('teams').select('id').eq('organization_id', organizationId);

    if (!isAllTeamsScope(selectedTeamId) && selectedTeamId !== UNASSIGNED_TEAM_ID) {
      teamQuery = teamQuery.eq('id', selectedTeamId!);
    } else if (!isOrgAdmin && userTeamIds.length > 0) {
      teamQuery = teamQuery.in('id', userTeamIds);
    } else if (!isOrgAdmin) {
      teamQuery = teamQuery.eq('id', 'non-existent-id');
    }

    const { data: teamData, error: teamError } = await teamQuery;
    if (teamError) {
      logger.error('Error fetching team stats:', teamError);
      throw teamError;
    }

    return {
      ...equipmentStats,
      ...workOrderStats,
      totalTeams: teamData?.length || 0,
    };
  } catch (error) {
    logger.error('Error in getTeamBasedDashboardStats:', error);
    throw error;
  }
};
