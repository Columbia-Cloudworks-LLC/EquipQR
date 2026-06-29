import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import {
  eventsToRpcPayload,
  type HistoricalTimelineEvent,
} from '@/features/work-orders/utils/historicalTimeline';
import {
  fetchWorkOrderStatusHistory,
  type WorkOrderStatusHistoryRow,
} from '@/features/work-orders/services/workOrderStatusHistoryQuery';

export type { WorkOrderStatusHistoryRow as WorkOrderTimelineHistoryRow };

export type ReplaceHistoricalTimelineResult = {
  success: boolean;
  error?: string;
  work_order_id?: string;
  event_count?: number;
  status?: string;
};

export const historicalTimelineService = {
  getWorkOrderTimeline(workOrderId: string, organizationId: string) {
    return fetchWorkOrderStatusHistory(workOrderId, organizationId);
  },

  async replaceHistoricalTimeline(
    workOrderId: string,
    events: HistoricalTimelineEvent[],
  ): Promise<ReplaceHistoricalTimelineResult> {
    try {
      const { data, error } = await supabase.rpc('replace_historical_work_order_timeline', {
        p_work_order_id: workOrderId,
        p_events: eventsToRpcPayload(events),
        p_skip_audit: false,
      });

      if (error) throw error;

      const result = data as ReplaceHistoricalTimelineResult | null;
      if (!result?.success) {
        return {
          success: false,
          error: result?.error ?? 'Failed to replace historical timeline',
        };
      }

      return result;
    } catch (error) {
      logger.error('Error replacing historical timeline:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to replace historical timeline',
      };
    }
  },
};
