import type { TeamMembership } from '@/contexts/team-context';
import {
  UNASSIGNED_TEAM_ID,
  type SelectedTeamId,
} from '@/contexts/selected-team-context';

/** Team roles that mirror `can_access_work_order_costs` RLS on the WO team. */
export const OPERATIONAL_TEAM_MEMBER_ROLES = ['owner', 'manager', 'technician'] as const;

export interface WorkOrderCostAccessContext {
  userId: string | undefined;
  isOrgAdmin: boolean;
  teamMemberships: TeamMembership[];
}

export interface WorkOrderCostAccessWorkOrder {
  team_id?: string | null;
  assignee_id?: string | null;
}

function isOperationalTeamRole(role: TeamMembership['role'] | string): boolean {
  return (OPERATIONAL_TEAM_MEMBER_ROLES as readonly string[]).includes(role);
}

/**
 * Mirrors `public.can_access_work_order_costs` for client-side UI gating.
 */
export function canViewWorkOrderCostsForWorkOrder(
  workOrder: WorkOrderCostAccessWorkOrder | null | undefined,
  ctx: WorkOrderCostAccessContext,
): boolean {
  if (!workOrder || !ctx.userId) {
    return false;
  }

  if (ctx.isOrgAdmin) {
    return true;
  }

  if (workOrder.assignee_id === ctx.userId) {
    return true;
  }

  if (!workOrder.team_id) {
    return false;
  }

  return ctx.teamMemberships.some(
    (membership) =>
      membership.team_id === workOrder.team_id &&
      isOperationalTeamRole(membership.role),
  );
}

/**
 * Dashboard / widget scope gate aligned with team selection in the TopBar.
 */
export function canViewWorkOrderCostsForSelectedTeam(
  selectedTeamId: SelectedTeamId,
  ctx: WorkOrderCostAccessContext,
): boolean {
  if (!ctx.userId) {
    return false;
  }

  if (ctx.isOrgAdmin) {
    return true;
  }

  if (selectedTeamId === null) {
    return ctx.teamMemberships.some((membership) => isOperationalTeamRole(membership.role));
  }

  if (selectedTeamId === UNASSIGNED_TEAM_ID) {
    return false;
  }

  return ctx.teamMemberships.some(
    (membership) =>
      membership.team_id === selectedTeamId && isOperationalTeamRole(membership.role),
  );
}
