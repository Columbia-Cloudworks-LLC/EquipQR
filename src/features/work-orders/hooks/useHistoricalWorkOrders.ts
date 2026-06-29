import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { defaultForkliftChecklist } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { workOrders } from '@/lib/queryKeys/workOrders';
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

function invalidateWorkOrderTimelineQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  workOrderId: string,
  organizationId?: string,
) {
  queryClient.invalidateQueries({ queryKey: workOrders.timeline(workOrderId) });
  queryClient.invalidateQueries({ queryKey: ['workOrders'] });
  queryClient.invalidateQueries({ queryKey: ['teamBasedWorkOrders'] });
  queryClient.invalidateQueries({ queryKey: ['workOrder'] });
  queryClient.invalidateQueries({ queryKey: ['preventativeMaintenance'] });

  if (organizationId) {
    queryClient.invalidateQueries({ queryKey: workOrders.byId(organizationId, workOrderId) });
    queryClient.invalidateQueries({ queryKey: workOrders.enhancedById(organizationId, workOrderId) });
    queryClient.invalidateQueries({ queryKey: workOrders.legacyById(organizationId, workOrderId) });
    queryClient.invalidateQueries({ queryKey: workOrders.list(organizationId) });
    queryClient.invalidateQueries({ queryKey: workOrders.teamBasedList(organizationId) });
  }
}

export const useWorkOrderTimeline = (workOrderId: string | undefined) => {
  return useQuery({
    queryKey: workOrders.timeline(workOrderId ?? 'unknown'),
    queryFn: async () => {
      if (!workOrderId) {
        return [];
      }

      const { data, error } = await historicalTimelineService.getWorkOrderTimeline(workOrderId);
      if (error) {
        throw error;
      }

      return data ?? [];
    },
    enabled: Boolean(workOrderId),
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

export const useReplaceHistoricalWorkOrderTimeline = () => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workOrderId,
      events,
    }: {
      workOrderId: string;
      events: HistoricalTimelineEvent[];
    }) => {
      const result = await historicalTimelineService.replaceHistoricalTimeline(workOrderId, events);
      if (!result.success) {
        throw new Error(result.error || 'Failed to replace historical timeline');
      }
      return result;
    },
    onSuccess: (_result, variables) => {
      invalidateWorkOrderTimelineQueries(
        queryClient,
        variables.workOrderId,
        currentOrganization?.id,
      );
      toast.success('Historical timeline updated successfully');
    },
    onError: (error: unknown) => {
      console.error('Error replacing historical timeline:', error);
      const message = error instanceof Error ? error.message : 'Failed to update historical timeline';
      toast.error(message);
    },
  });
};
