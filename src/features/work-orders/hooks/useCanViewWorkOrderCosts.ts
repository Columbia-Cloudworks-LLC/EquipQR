import { useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { useSelectedTeam } from '@/hooks/useSelectedTeam';
import { useWorkOrderCostAssigneeScope } from '@/features/work-orders/hooks/useWorkOrderCostAssigneeScope';
import {
  canViewWorkOrderCostsForSelectedTeam,
  canViewWorkOrderCostsForWorkOrder,
  type WorkOrderCostAccessWorkOrder,
} from '@/features/work-orders/utils/canViewWorkOrderCostsAccess';

function useWorkOrderCostAccessContext() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { teamMemberships } = useTeamMembership();
  const isOrgAdmin =
    currentOrganization?.userRole === 'owner' ||
    currentOrganization?.userRole === 'admin';

  return useMemo(
    () => ({
      userId: user?.id,
      isOrgAdmin,
      teamMemberships,
    }),
    [user?.id, isOrgAdmin, teamMemberships],
  );
}

/**
 * Client-side gate for dashboard/widget surfaces scoped by the selected team.
 * Org owners/admins and operational team roles may see cost widgets; customer
 * roles stay oblivious.
 */
export function useCanViewWorkOrderCosts(): boolean {
  const ctx = useWorkOrderCostAccessContext();
  const { selectedTeamId } = useSelectedTeam();
  const { currentOrganization } = useOrganization();
  const assigneeScope = useWorkOrderCostAssigneeScope(currentOrganization?.id, selectedTeamId);
  return canViewWorkOrderCostsForSelectedTeam(selectedTeamId, ctx, assigneeScope);
}

/**
 * Per-work-order gate for cost/labor UI — mirrors `can_access_work_order_costs`.
 */
export function useCanViewWorkOrderCostsForWorkOrder(
  workOrder: WorkOrderCostAccessWorkOrder | null | undefined,
): boolean {
  const ctx = useWorkOrderCostAccessContext();
  return canViewWorkOrderCostsForWorkOrder(workOrder, ctx);
}
