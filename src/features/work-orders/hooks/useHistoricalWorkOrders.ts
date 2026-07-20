import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { defaultForkliftChecklist } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { workOrders } from '@/lib/queryKeys/workOrders';
import { invalidateWorkOrderCaches } from '@/features/work-orders/utils/invalidateWorkOrderQueries';
import { historicalTimelineService } from '@/features/work-orders/services/historicalTimelineService';
import {
  eventsToRpcPayload,
  type HistoricalTimelineEvent,
} from '@/features/work-orders/utils/historicalTimeline';

export interface HistoricalWorkOrderData {
  equipmentId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  historicalStartDate: string;
  historicalNotes?: string;
  assigneeId?: string;
  teamId?: string;
  dueDate?: string;
  completedDate?: string;
  hasPM?: boolean;
  pmStatus?: string;
  pmCompletionDate?: string;
  pmNotes?: string;
  pmChecklistData?: unknown[];
  timelineEvents?: HistoricalTimelineEvent[];
}

interface HistoricalWorkOrderMutationResult {
  success: boolean;
  error?: string | null;
  has_pm?: boolean;
  pm_id?: string | null;
  work_order_id?: string;
  [key: string]: unknown;
}

function assertHistoricalTimelineAdminRole(
  role: string | undefined,
): asserts role is 'owner' | 'admin' {
  if (role !== 'owner' && role !== 'admin') {
    throw new Error('Permission denied');
  }
}

type HistoricalTimelineMutationVariables = {
  workOrderId: string;
  events: HistoricalTimelineEvent[];
};

type HistoricalTimelineMutationExecutor = (
  organizationId: string,
  workOrderId: string,
  events: HistoricalTimelineEvent[],
) => ReturnType<typeof historicalTimelineService.replaceHistoricalTimeline>;

function useHistoricalTimelineMutation(options: {
  execute: HistoricalTimelineMutationExecutor;
  failureMessage: string;
  successMessage: string;
  logLabel: string;
}) {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workOrderId, events }: HistoricalTimelineMutationVariables) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      assertHistoricalTimelineAdminRole(currentOrganization.userRole);

      const result = await options.execute(currentOrganization.id, workOrderId, events);
      if (!result.success) {
        throw new Error(result.error || options.failureMessage);
      }
      return result;
    },
    onSuccess: (_result, variables) => {
      if (currentOrganization?.id) {
        invalidateWorkOrderCaches(queryClient, currentOrganization.id, variables.workOrderId);
        void queryClient.invalidateQueries({
          queryKey: workOrders.timeline(variables.workOrderId),
        });
      }
      toast.success(options.successMessage);
    },
    onError: (error: unknown) => {
      console.error(`Error ${options.logLabel}:`, error);
      const message = error instanceof Error ? error.message : options.failureMessage;
      toast.error(message);
    },
  });
}

export const useWorkOrderTimeline = (workOrderId: string | undefined) => {
  const { currentOrganization } = useOrganization();

  return useQuery({
    queryKey: workOrders.timeline(workOrderId ?? 'unknown'),
    queryFn: async () => {
      if (!workOrderId || !currentOrganization?.id) {
        return [];
      }

      const { data, error } = await historicalTimelineService.getWorkOrderTimeline(
        workOrderId,
        currentOrganization.id,
      );
      if (error) {
        throw error;
      }

      return data ?? [];
    },
    enabled: Boolean(workOrderId && currentOrganization?.id),
  });
};

export const useCreateHistoricalWorkOrder = (options?: {
  onSuccess?: (workOrder: HistoricalWorkOrderMutationResult & { id: string }) => void;
}) => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: HistoricalWorkOrderData) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data: result, error } = await supabase.rpc(
        'create_historical_work_order_with_pm',
        {
          p_organization_id: currentOrganization.id,
          p_equipment_id: data.equipmentId,
          p_title: data.title,
          p_description: data.description,
          p_priority: data.priority,
          p_status: data.status,
          p_historical_start_date: data.historicalStartDate,
          p_historical_notes: data.historicalNotes,
          p_assignee_id: data.assigneeId,
          p_team_id: data.teamId,
          p_due_date: data.dueDate,
          p_completed_date: data.completedDate,
          p_has_pm: data.hasPM || false,
          p_pm_status: data.pmStatus || 'pending',
          p_pm_completion_date: data.pmCompletionDate,
          p_pm_notes: data.pmNotes,
          p_pm_checklist_data: data.hasPM && (!data.pmChecklistData || data.pmChecklistData.length === 0)
            ? defaultForkliftChecklist
            : data.pmChecklistData || [],
          // Prefer null over undefined so PostgREST binds the timeline overload
          // (omitted keys can resolve to a legacy signature without this arg).
          p_timeline_events: data.timelineEvents
            ? eventsToRpcPayload(data.timelineEvents)
            : null,
        },
      );

      if (error) {
        console.error('Error creating historical work order:', error);
        throw error;
      }

      const resultData = result as HistoricalWorkOrderMutationResult | null;
      if (!resultData?.success) {
        throw new Error(resultData?.error || 'Failed to create historical work order');
      }

      return resultData;
    },
    onSuccess: (result: HistoricalWorkOrderMutationResult) => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      queryClient.invalidateQueries({ queryKey: ['teamBasedWorkOrders'] });
      queryClient.invalidateQueries({ queryKey: ['workOrder'] });

      if (result.has_pm && result.pm_id) {
        queryClient.invalidateQueries({ queryKey: ['preventativeMaintenance'] });
      }

      toast.success('Historical work order created successfully');

      if (options?.onSuccess && result.work_order_id) {
        options.onSuccess({ id: result.work_order_id, ...result });
      }
    },
    onError: (error: unknown) => {
      console.error('Error creating historical work order:', error);
      const message = error instanceof Error ? error.message : 'Failed to create historical work order';
      toast.error(message);
    },
  });
};

export const useReplaceHistoricalWorkOrderTimeline = () =>
  useHistoricalTimelineMutation({
    execute: (organizationId, workOrderId, events) =>
      historicalTimelineService.replaceHistoricalTimeline(organizationId, workOrderId, events),
    failureMessage: 'Failed to replace historical timeline',
    successMessage: 'Historical timeline updated successfully',
    logLabel: 'replacing historical timeline',
  });

export const useConvertWorkOrderToHistorical = () =>
  useHistoricalTimelineMutation({
    execute: (organizationId, workOrderId, events) =>
      historicalTimelineService.convertWorkOrderToHistorical(organizationId, workOrderId, events),
    failureMessage: 'Failed to convert work order to historical',
    successMessage: 'Work order converted to historical record',
    logLabel: 'converting work order to historical',
  });
