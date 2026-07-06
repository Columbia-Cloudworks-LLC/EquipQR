import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { WorkOrderCostAssigneeScope } from '@/features/work-orders/utils/canViewWorkOrderCostsAccess';

const EMPTY_ASSIGNEE_SCOPE: WorkOrderCostAssigneeScope = {
  hasAssignedWorkOrders: false,
  assignedTeamIds: new Set<string>(),
};

export function useWorkOrderCostAssigneeScope(
  organizationId: string | undefined,
): WorkOrderCostAssigneeScope {
  const { user } = useAuth();

  const { data = EMPTY_ASSIGNEE_SCOPE } = useQuery({
    queryKey: ['work-orders', 'cost-assignee-scope', organizationId, user?.id],
    enabled: Boolean(organizationId && user?.id),
    queryFn: async (): Promise<WorkOrderCostAssigneeScope> => {
      const { data: rows, error } = await supabase
        .from('work_orders')
        .select('team_id')
        .eq('organization_id', organizationId!)
        .eq('assignee_id', user!.id)
        .limit(50);

      if (error) {
        throw error;
      }

      const assignedTeamIds = new Set<string>();
      for (const row of rows ?? []) {
        if (row.team_id) {
          assignedTeamIds.add(row.team_id);
        }
      }

      return {
        hasAssignedWorkOrders: (rows?.length ?? 0) > 0,
        assignedTeamIds,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  return data;
}
