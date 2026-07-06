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

const ASSIGNEE_TEAM_PAGE_SIZE = 200;

async function fetchAssignedTeamIds(
  organizationId: string,
  userId: string,
): Promise<ReadonlySet<string>> {
  const assignedTeamIds = new Set<string>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('work_orders')
      .select('team_id')
      .eq('organization_id', organizationId)
      .eq('assignee_id', userId)
      .not('team_id', 'is', null)
      .order('id')
      .range(offset, offset + ASSIGNEE_TEAM_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const rows = data ?? [];
    for (const row of rows) {
      if (row.team_id) {
        assignedTeamIds.add(row.team_id);
      }
    }

    if (rows.length < ASSIGNEE_TEAM_PAGE_SIZE) {
      break;
    }

    offset += ASSIGNEE_TEAM_PAGE_SIZE;
  }

  return assignedTeamIds;
}

export function useWorkOrderCostAssigneeScope(
  organizationId: string | undefined,
  selectedTeamId: SelectedTeamId,
): WorkOrderCostAssigneeScope {
  const { user } = useAuth();
  const userId = user?.id;

  const { data = EMPTY_ASSIGNEE_SCOPE } = useQuery({
    queryKey: ['work-orders', 'cost-assignee-scope', organizationId, userId, selectedTeamId],
    enabled: Boolean(organizationId && userId),
    queryFn: async (): Promise<WorkOrderCostAssigneeScope> => {
      const orgId = organizationId;
      const assigneeId = userId;
      if (!orgId || !assigneeId) {
        return EMPTY_ASSIGNEE_SCOPE;
      }

      if (selectedTeamId === UNASSIGNED_TEAM_ID) {
        return EMPTY_ASSIGNEE_SCOPE;
      }

      if (selectedTeamId) {
        const { count, error } = await supabase
          .from('work_orders')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('assignee_id', assigneeId)
          .eq('team_id', selectedTeamId);

        if (error) {
          throw error;
        }

        const hasAssignedOnTeam = (count ?? 0) > 0;
        return {
          hasAssignedWorkOrders: hasAssignedOnTeam,
          assignedTeamIds: hasAssignedOnTeam ? new Set([selectedTeamId]) : new Set<string>(),
        };
      }

      const { count, error: countError } = await supabase
        .from('work_orders')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('assignee_id', assigneeId);

      if (countError) {
        throw countError;
      }

      const hasAssignedWorkOrders = (count ?? 0) > 0;
      if (!hasAssignedWorkOrders) {
        return EMPTY_ASSIGNEE_SCOPE;
      }

      const assignedTeamIds = await fetchAssignedTeamIds(orgId, assigneeId);
      return { hasAssignedWorkOrders, assignedTeamIds };
    },
    staleTime: 5 * 60 * 1000,
  });

  return data;
}
