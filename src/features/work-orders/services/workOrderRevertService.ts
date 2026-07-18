import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { fetchWorkOrderStatusHistory } from '@/features/work-orders/services/workOrderStatusHistoryQuery';

export interface RevertResult {
  success: boolean;
  error?: string;
  old_status?: string;
  new_status?: string;
  /** True when a completed/cancelled work order was also reopened to accepted. */
  work_order_reopened?: boolean;
  work_order_old_status?: string;
  work_order_new_status?: string;
}

export type RevertPMCompletionOptions = {
  reason?: string;
  /** When the parent work order is completed/cancelled, also reopen it to accepted. */
  workOrderId?: string;
  workOrderStatus?: string;
};

const TERMINAL_WORK_ORDER_STATUSES = new Set(['completed', 'cancelled']);
const NON_TERMINAL_REOPEN_ERROR = 'Can only revert completed or cancelled work orders';

function shouldReopenWorkOrder(status: string | undefined): boolean {
  return typeof status === 'string' && TERMINAL_WORK_ORDER_STATUSES.has(status);
}

export const workOrderRevertService = {
  async revertWorkOrderStatus(workOrderId: string, reason?: string): Promise<RevertResult> {
    try {
      const { data, error } = await supabase.rpc('revert_work_order_status', {
        p_work_order_id: workOrderId,
        p_reason: reason || 'Reverted by admin'
      });

      if (error) throw error;
      return data as unknown as RevertResult;
    } catch (error) {
      logger.error('Error reverting work order status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revert work order status'
      };
    }
  },

  async revertPMCompletion(
    pmId: string,
    reasonOrOptions?: string | RevertPMCompletionOptions,
  ): Promise<RevertResult> {
    const options: RevertPMCompletionOptions =
      typeof reasonOrOptions === 'string'
        ? { reason: reasonOrOptions }
        : (reasonOrOptions ?? {});
    const reason = options.reason || 'Reverted by admin';

    try {
      const { data, error } = await supabase.rpc('revert_pm_completion', {
        p_pm_id: pmId,
        p_reason: reason,
      });

      if (error) throw error;
      const pmResult = data as unknown as RevertResult;
      if (!pmResult.success) {
        return pmResult;
      }

      const workOrderId = options.workOrderId;
      if (!workOrderId || !shouldReopenWorkOrder(options.workOrderStatus)) {
        return { ...pmResult, work_order_reopened: false };
      }

      const woResult = await this.revertWorkOrderStatus(
        workOrderId,
        'Work order reopened with PM completion revert by admin',
      );

      if (!woResult.success) {
        const woError = woResult.error?.trim();
        if (woError === NON_TERMINAL_REOPEN_ERROR) {
          return { ...pmResult, work_order_reopened: false };
        }
        return {
          success: false,
          error: woError
            ? `PM was reverted, but the work order could not be reopened (${woError}). Use Revert to Accepted.`
            : 'PM was reverted, but the work order could not be reopened. Use Revert to Accepted.',
          old_status: pmResult.old_status,
          new_status: pmResult.new_status,
          work_order_reopened: false,
        };
      }

      return {
        ...pmResult,
        work_order_reopened: true,
        work_order_old_status: woResult.old_status,
        work_order_new_status: woResult.new_status,
      };
    } catch (error) {
      logger.error('Error reverting PM completion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revert PM completion'
      };
    }
  },

  async getWorkOrderHistory(workOrderId: string, organizationId: string) {
    return fetchWorkOrderStatusHistory(workOrderId, organizationId);
  },

  async getPMHistory(pmId: string) {
    try {
      const { data, error } = await supabase
        .from('pm_status_history')
        .select(`
          *,
          profiles!changed_by (
            name,
            email
          )
        `)
        .eq('pm_id', pmId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching PM history:', error);
      return { data: null, error };
    }
  }
};
