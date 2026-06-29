import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface WorkOrderImageCount {
  count: number;
  images: Array<{
    id: string;
    file_name: string;
    file_url: string;
  }>;
}

export const getWorkOrderImageCount = async (workOrderId: string): Promise<WorkOrderImageCount> => {
  try {
    const { data, error } = await supabase
      .from('work_order_images')
      .select('id, file_name, file_url')
      .eq('work_order_id', workOrderId);

    if (error) throw error;

    return {
      count: data?.length || 0,
      images: data || []
    };
  } catch (error) {
    logger.error('Error fetching work order image count:', error);
    throw error;
  }
};

export const deleteWorkOrderCascade = async (workOrderId: string): Promise<void> => {
  try {
    const { data, error } = await supabase.rpc('delete_work_order_cascade', {
      p_work_order_id: workOrderId,
    });

    if (error) {
      throw new Error(error.message);
    }

    const result = data as { success?: boolean; error?: string } | null;
    if (!result?.success) {
      throw new Error(result?.error ?? 'Failed to delete work order');
    }
  } catch (error) {
    logger.error('Error deleting work order:', error);
    throw error;
  }
};

export const deleteWorkOrder = async (workOrderId: string): Promise<void> => {
  return deleteWorkOrderCascade(workOrderId);
};
