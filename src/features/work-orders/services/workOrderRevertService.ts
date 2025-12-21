import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface RevertResult {
  success: boolean;
  error?: string;
  old_status?: string;
  new_status?: string;
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

  async revertPMCompletion(pmId: string, reason?: string): Promise<RevertResult> {
    try {
      const { data, error } = await supabase.rpc('revert_pm_completion', {
        p_pm_id: pmId,
        p_reason: reason || 'Reverted by admin'
      });

      if (error) throw error;
      return data as unknown as RevertResult;
    } catch (error) {
      logger.error('Error reverting PM completion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revert PM completion'
      };
    }
  },

  async getWorkOrderHistory(workOrderId: string) {
    try {
      const { data, error } = await supabase
        .from('work_order_status_history')
        .select(`
          *,
          profiles!changed_by (
            name,
            email
          )
        `)
        .eq('work_order_id', workOrderId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching work order history:', error);
      return { data: null, error };
    }
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

