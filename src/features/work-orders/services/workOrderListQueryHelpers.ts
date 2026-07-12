import { WORK_ORDER_LIST_SELECT } from '@/features/work-orders/services/workOrderRowMapper';

export type WorkOrderTeamScope = {
  userTeams?: string[];
  teamFilter?: string;
};

/**
 * Builds the work-order list select string, optionally requiring an inner join
 * on equipment so team filters can be applied in the same query.
 */
export function buildWorkOrderListSelect(requireEquipmentInnerJoin: boolean): string {
  if (!requireEquipmentInnerJoin) {
    return WORK_ORDER_LIST_SELECT;
  }

  return WORK_ORDER_LIST_SELECT.replace(
    'equipment:equipment!work_orders_equipment_id_fkey (',
    'equipment:equipment!work_orders_equipment_id_fkey!inner (',
  );
}

export function resolveWorkOrderTeamScope(
  filters: {
    userTeamIds?: string[];
    isOrgAdmin?: boolean;
    teamId?: string;
  },
): WorkOrderTeamScope {
  const userTeams =
    filters.userTeamIds !== undefined && !filters.isOrgAdmin
      ? filters.userTeamIds
      : undefined;
  const teamFilter =
    filters.teamId && filters.teamId !== 'all' ? filters.teamId : undefined;

  const scope: WorkOrderTeamScope = {};
  if (userTeams !== undefined) {
    scope.userTeams = userTeams;
  }
  if (teamFilter) {
    scope.teamFilter = teamFilter;
  }

  return scope;
}

export function requiresEquipmentInnerJoin(teamScope: WorkOrderTeamScope): boolean {
  return Boolean(
    (teamScope.userTeams && teamScope.userTeams.length > 0) || teamScope.teamFilter,
  );
}
