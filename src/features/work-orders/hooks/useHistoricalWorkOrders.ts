import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import {
  defaultForkliftChecklist,
  type PMChecklistItem,
} from '@/features/pm-templates/services/preventativeMaintenanceService';
import type { Json } from '@/integrations/supabase/types';
import { workOrders } from '@/lib/queryKeys/workOrders';
import { invalidateWorkOrderCaches } from '@/features/work-orders/utils/invalidateWorkOrderQueries';
import { historicalTimelineService } from '@/features/work-orders/services/historicalTimelineService';
import {
  eventsToRpcPayload,
  type HistoricalTimelineEvent,
} from '@/features/work-orders/utils/historicalTimeline';
import { parseDue, persistDue, type DuePersist } from '@/features/work-orders/calendar';
import { attachWorkOrderCreationImages } from '@/features/work-orders/services/workOrderNotesService';
import { setWorkOrderQuickBooksSyncExcluded } from '@/features/work-orders/hooks/useWorkOrderQuickBooksSyncExclusion';
import { equipment as equipmentKeys, pmStatus as pmStatusKeys } from '@/lib/queryKeys';
import { logger } from '@/utils/logger';

export interface HistoricalWorkOrderData {
  equipmentId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  historicalStartDate: string;
  historicalNotes?: string;
  assigneeId?: string;
  dueDate?: string;
  dueDateHasTime?: boolean;
  completedDate?: string;
  hasPM?: boolean;
  pmStatus?: string;
  pmCompletionDate?: string;
  pmNotes?: string;
  pmChecklistData?: PMChecklistItem[];
  timelineEvents?: HistoricalTimelineEvent[];
  /** Template the PM checklist was built from, stored on the PM record. */
  pmTemplateId?: string;
  /**
   * Meter reading taken at the service. Logged on the work order, its PM and the
   * hour history; the equipment's current hours only move if this is higher.
   */
  serviceHours?: number;
  /**
   * Historical records default to "Do Not Sync" in the database. True opts this
   * one back in so it can be billed in QuickBooks.
   */
  quickBooksSyncReady?: boolean;
  /** Paper sheet scans / photos attached at creation. */
  images?: File[];
  creationPhotoNote?: string;
}

interface HistoricalFollowUpWarnings {
  hoursFailed: boolean;
  quickBooksOptInFailed: boolean;
  photosFailed: boolean;
}

/**
 * Follow-up writes after the historical work order exists. Each one is
 * best-effort: the record is already saved, so a failure is reported as a
 * warning instead of failing the whole entry. A failed QuickBooks opt-in leaves
 * the record excluded, which is the safe direction for billing.
 */
async function runHistoricalFollowUps(
  organizationId: string,
  workOrderId: string,
  pmId: string | null | undefined,
  data: HistoricalWorkOrderData,
): Promise<HistoricalFollowUpWarnings> {
  const warnings: HistoricalFollowUpWarnings = {
    hoursFailed: false,
    quickBooksOptInFailed: false,
    photosFailed: false,
  };

  if (pmId && data.pmTemplateId) {
    const { error } = await supabase
      .from('preventative_maintenance')
      .update({ template_id: data.pmTemplateId })
      .eq('id', pmId)
      .eq('organization_id', organizationId);
    if (error) {
      logger.error('Failed to link PM template to historical PM', error);
    }
  }

  if (data.serviceHours != null && data.serviceHours >= 0) {
    const { data: hoursResult, error } = await supabase.rpc('log_work_order_service_hours', {
      p_work_order_id: workOrderId,
      p_hours: data.serviceHours,
      p_notes: `Service reading from logged work order: ${data.title}`,
    });
    const hoursOutcome = hoursResult as { success?: boolean } | null;
    if (error || hoursOutcome?.success !== true) {
      logger.error('Failed to log service hours for historical work order', error ?? hoursResult);
      warnings.hoursFailed = true;
    }
  }

  if (data.quickBooksSyncReady) {
    try {
      await setWorkOrderQuickBooksSyncExcluded(organizationId, workOrderId, false);
    } catch (error) {
      logger.error('Failed to opt historical work order into QuickBooks sync', error);
      warnings.quickBooksOptInFailed = true;
    }
  }

  if (data.images?.length) {
    try {
      const { primaryImageId } = await attachWorkOrderCreationImages({
        workOrderId,
        organizationId,
        images: data.images,
        noteContent: data.creationPhotoNote,
      });
      warnings.photosFailed = !primaryImageId;
    } catch (error) {
      logger.error('Failed to attach paper sheet to historical work order', error);
      warnings.photosFailed = true;
    }
  }

  return warnings;
}

interface HistoricalWorkOrderMutationResult {
  success: boolean;
  error?: string | null;
  has_pm?: boolean;
  pm_id?: string | null;
  work_order_id?: string;
  followUpWarnings?: HistoricalFollowUpWarnings;
  [key: string]: unknown;
}

function assertHistoricalTimelineAdminRole(
  role: string | undefined,
): asserts role is 'owner' | 'admin' {
  if (role !== 'owner' && role !== 'admin') {
    throw new Error('Permission denied');
  }
}

export function historicalDueFollowUp(
  data: Pick<HistoricalWorkOrderData, 'dueDate' | 'dueDateHasTime'>,
): DuePersist | null {
  if (!data.dueDateHasTime || data.dueDate == null || data.dueDate === '') {
    return null;
  }
  return persistDue(parseDue({
    dueDate: data.dueDate,
    dueDateHasTime: true,
  }));
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
  /** Overrides the default success toast (e.g. the quieter rapid-entry copy). */
  successMessage?: string;
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
          p_due_date: data.dueDate,
          p_completed_date: data.completedDate,
          p_has_pm: data.hasPM || false,
          p_pm_status: data.pmStatus || 'pending',
          p_pm_completion_date: data.pmCompletionDate,
          p_pm_notes: data.pmNotes,
          p_pm_checklist_data: (data.hasPM && (!data.pmChecklistData || data.pmChecklistData.length === 0)
            ? defaultForkliftChecklist
            : data.pmChecklistData ?? []) as unknown as Json,
          // Omit when absent: both DEFINER overloads retain authenticated EXECUTE
          // after #1310 re-lock (legacy without p_timeline_events + timeline).
          ...(data.timelineEvents
            ? { p_timeline_events: eventsToRpcPayload(data.timelineEvents) }
            : {}),
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

      const dueFollowUp = historicalDueFollowUp(data);
      if (dueFollowUp && resultData.work_order_id) {
        const { error: dueError } = await supabase
          .from('work_orders')
          .update({
            due_date: dueFollowUp.dueDate,
            due_date_has_time: dueFollowUp.dueDateHasTime,
          })
          .eq('id', resultData.work_order_id)
          .eq('organization_id', currentOrganization.id);
        if (dueError) {
          throw dueError;
        }
      }

      if (resultData.work_order_id) {
        resultData.followUpWarnings = await runHistoricalFollowUps(
          currentOrganization.id,
          resultData.work_order_id,
          resultData.pm_id,
          data,
        );
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

      // Logged service can move the machine's hours and last-PM date.
      queryClient.invalidateQueries({ queryKey: equipmentKeys.root });
      queryClient.invalidateQueries({ queryKey: pmStatusKeys.root });
      if (result.work_order_id) {
        queryClient.invalidateQueries({ queryKey: workOrders.images(result.work_order_id) });
      }

      toast.success(options?.successMessage ?? 'Historical work order created successfully');

      const warnings = result.followUpWarnings;
      if (warnings?.hoursFailed) {
        toast.warning('Work order saved, but the machine hours reading was not logged.');
      }
      if (warnings?.quickBooksOptInFailed) {
        toast.warning('Work order saved as Historical Only. Turn on QuickBooks sync from the work order to bill it.');
      }
      if (warnings?.photosFailed) {
        toast.warning('Work order saved, but the attachment did not upload. Open the work order to retry.');
      }

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
