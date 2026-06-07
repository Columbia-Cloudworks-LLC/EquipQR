import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { validateStorageQuota } from '@/utils/storageQuota';
import {
  uploadImageToStorage,
  resolveImageDisplayUrl,
  batchResolveWorkOrderImageDisplayUrls,
  displayUrlForStoredPrivateImage,
  deleteImageFromStorage,
} from '@/services/imageUploadService';
import { WorkOrderImage } from '@/features/work-orders/types/workOrder';
import {
  fetchWorkOrderInOrganization,
  requireAuthenticatedClaims,
} from '@/features/work-orders/services/workOrderServiceAccess';

export async function fetchWorkOrderImagesForService(
  organizationId: string,
  workOrderId: string,
): Promise<WorkOrderImage[]> {
  const workOrder = await fetchWorkOrderInOrganization(organizationId, workOrderId);
  if (!workOrder) {
    throw new Error('Work order not found');
  }

  const { data: images, error } = await supabase
    .from('work_order_images')
    .select(`
      *,
      work_orders!inner (
        organization_id
      )
    `)
    .eq('work_order_id', workOrderId)
    .eq('work_orders.organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching work order images:', error);
    throw error;
  }

  if (!images || images.length === 0) {
    return [];
  }

  const uploaderIds = [...new Set(images.map((img) => img.uploaded_by))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', uploaderIds);

  const signedUrls = await batchResolveWorkOrderImageDisplayUrls(images.map((img) => img.file_url));
  return images
    .map((image, i) => {
      const { work_orders: _workOrderScope, ...imageRow } = image as typeof image & {
        work_orders?: { organization_id: string };
      };
      const uploader = (profiles || []).find((p) => p.id === imageRow.uploaded_by);
      const displayUrl = displayUrlForStoredPrivateImage(signedUrls[i], imageRow.file_url);
      if (displayUrl == null) return null;
      return {
        ...imageRow,
        file_url: displayUrl,
        uploaded_by_name: uploader?.name || 'Unknown',
      };
    })
    .filter((row): row is WorkOrderImage => row != null);
}

export async function uploadWorkOrderImageForService(
  organizationId: string,
  workOrderId: string,
  file: File,
  description?: string,
): Promise<WorkOrderImage> {
  const auth = await requireAuthenticatedClaims();
  if ('error' in auth) {
    throw auth.error;
  }
  const claims = auth;

  const workOrder = await fetchWorkOrderInOrganization(organizationId, workOrderId);
  if (!workOrder) {
    throw new Error('Work order not found');
  }

  await validateStorageQuota(organizationId, file.size);

  const fileExt = file.name.split('.').pop();
  const fileName = `${claims.sub}/${workOrderId}/${Date.now()}.${fileExt}`;
  const storedPath = await uploadImageToStorage('work-order-images', fileName, file);

  const { data: imageRecord, error: imageError } = await supabase
    .from('work_order_images')
    .insert({
      work_order_id: workOrderId,
      uploaded_by: claims.sub,
      file_name: file.name,
      file_url: storedPath,
      file_size: file.size,
      mime_type: file.type,
      description: description || null,
    })
    .select()
    .single();

  if (imageError) {
    logger.error('Error saving image record:', imageError);
    try {
      await deleteImageFromStorage('work-order-images', storedPath);
    } catch (cleanupError) {
      logger.error(
        'Failed to delete orphaned work-order image after DB insert failure:',
        cleanupError,
      );
    }
    throw imageError;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', claims.sub)
    .single();

  const displayUrl = displayUrlForStoredPrivateImage(
    await resolveImageDisplayUrl('work-order-images', imageRecord.file_url),
    imageRecord.file_url,
  );

  if (displayUrl == null) {
    const cleanupCtx = {
      imageId: imageRecord.id,
      storedPath,
      workOrderId,
    };
    logger.error('Signing failed for uploaded work order image, rolling back', cleanupCtx);
    const { error: dbDeleteError } = await supabase
      .from('work_order_images')
      .delete()
      .eq('id', imageRecord.id)
      .eq('work_order_id', workOrderId);
    if (dbDeleteError) {
      logger.error(
        'Failed to delete DB row during signing-failure rollback; skipping storage cleanup to preserve consistency',
        { ...cleanupCtx, error: dbDeleteError },
      );
    } else {
      try {
        await deleteImageFromStorage('work-order-images', storedPath);
      } catch (cleanupError) {
        logger.error(
          'Failed to delete orphaned work-order storage object during rollback',
          { ...cleanupCtx, error: cleanupError },
        );
      }
    }
    throw new Error('Could not generate a secure link for the uploaded image. Try again.');
  }

  return {
    ...imageRecord,
    uploaded_by_name: profile?.name || 'Unknown',
    file_url: displayUrl,
  };
}
