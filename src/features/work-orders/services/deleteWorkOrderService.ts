import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { normalizeStoredObjectPath } from '@/services/imageUploadService';

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

const deleteWorkOrderImagesFromStorage = async (
  images: WorkOrderImageCount['images'],
  workOrderId: string,
): Promise<void> => {
  if (images.length === 0) return;

  const filePaths = images
    .map((img) => normalizeStoredObjectPath(img.file_url, 'work-order-images'))
    .filter((p): p is string => !!p);

  if (filePaths.length === 0) {
    logger.error('Skipping work-order image storage cleanup because no valid object paths were found', {
      workOrderId,
      imageCount: images.length,
    });
    return;
  }

  const { error: storageError } = await supabase.storage
    .from('work-order-images')
    .remove(filePaths);

  if (storageError) {
    logger.error('Some storage files could not be deleted:', storageError);
  }
};

export const deleteWorkOrderCascade = async (workOrderId: string): Promise<void> => {
  try {
    const { images } = await getWorkOrderImageCount(workOrderId);
    await deleteWorkOrderImagesFromStorage(images, workOrderId);

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
