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
    // Get all work order images before deletion
    const { images } = await getWorkOrderImageCount(workOrderId);

    // Delete storage files first
    if (images.length > 0) {
      const filePaths = images.map(img => {
        // Extract file path from URL
        const url = new URL(img.file_url);
        const pathSegments = url.pathname.split('/');
        // Path format: /storage/v1/object/public/bucket/path
        return pathSegments.slice(5).join('/'); // Remove /storage/v1/object/public/bucket
      });

      const { error: storageError } = await supabase.storage
        .from('work-order-images')
        .remove(filePaths);

      if (storageError) {
        logger.warn('Some storage files could not be deleted:', storageError);
        // Continue with database deletion even if storage cleanup fails
      }
    }

    // Delete work order images from database
    const { error: imagesError } = await supabase
      .from('work_order_images')
      .delete()
      .eq('work_order_id', workOrderId);

    if (imagesError) throw imagesError;

    // Delete work order notes
    const { error: notesError } = await supabase
      .from('work_order_notes')
      .delete()
      .eq('work_order_id', workOrderId);

    if (notesError) throw notesError;

    // Delete work order costs
    const { error: costsError } = await supabase
      .from('work_order_costs')
      .delete()
      .eq('work_order_id', workOrderId);

    if (costsError) throw costsError;

    // Delete preventative maintenance records
    const { error: pmError } = await supabase
      .from('preventative_maintenance')
      .delete()
      .eq('work_order_id', workOrderId);

    if (pmError) throw pmError;

    // Delete work order status history
    const { error: historyError } = await supabase
      .from('work_order_status_history')
      .delete()
      .eq('work_order_id', workOrderId);

    if (historyError) throw historyError;

    // Finally, delete the work order itself
    const { error: workOrderError } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', workOrderId);

    if (workOrderError) throw workOrderError;

  } catch (error) {
    logger.error('Error deleting work order:', error);
    throw error;
  }
};

// Wrapper function for external use
export const deleteWorkOrder = async (workOrderId: string): Promise<void> => {
  return deleteWorkOrderCascade(workOrderId);
};

