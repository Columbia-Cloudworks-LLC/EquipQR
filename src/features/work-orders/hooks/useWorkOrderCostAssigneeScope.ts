import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  UNASSIGNED_TEAM_ID,
  type SelectedTeamId,
} from '@/contexts/selected-team-context';
import type { WorkOrderCostAssigneeScope } from '@/features/work-orders/utils/canViewWorkOrderCostsAccess';

const EMPTY_ASSIGNEE_SCOPE: WorkOrderCostAssigneeScope = {
  hasAssignedWorkOrders: false,
  assignedTeamIds: new Set<string>(),
};

export function useWorkOrderCostAssigneeScope(
  organizationId: string | undefined,
  selectedTeamId: SelectedTeamId,
  enabled: boolean,
): WorkOrderCostAssigneeScope {
  const { user } = useAuth();
  const userId = user?.id;

  const { data = EMPTY_ASSIGNEE_SCOPE } = useQuery({
    queryKey: ['work-orders', 'cost-assignee-scope', organizationId, userId, selectedTeamId],
    enabled: enabled && Boolean(organizationId && userId),
    queryFn: async (): Promise<WorkOrderCostAssigneeScope> => {
      const orgId = organizationId;
      const assigneeId = userId;
      if (!orgId || !assigneeId) {
        return EMPTY_ASSIGNEE_SCOPE;
      }

      if (selectedTeamId === UNASSIGNED_TEAM_ID) {
        return EMPTY_ASSIGNEE_SCOPE;
      }

      let query = supabase
        .from('work_orders')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('assignee_id', assigneeId);

      if (selectedTeamId) {
        query = query.eq('team_id', selectedTeamId);
      }

      const { count, error } = await query;
      if (error) {
        throw error;
      }

      const hasAssignedWorkOrders = (count ?? 0) > 0;
      if (!hasAssignedWorkOrders) {
        return EMPTY_ASSIGNEE_SCOPE;
      }

      return {
        hasAssignedWorkOrders: true,
        assignedTeamIds: selectedTeamId ? new Set([selectedTeamId]) : new Set<string>(),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  return data;
}
