import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { deleteImageFromStorage, type StorageBucket } from '@/services/imageUploadService';

export async function rollbackNoteImageAfterSigningFailure(params: {
  bucket: string;
  imagesTable: 'equipment_note_images' | 'work_order_images';
  imageId: string;
  storedPath: string;
  logContext?: Record<string, unknown>;
}): Promise<void> {
  const ctx = { imageId: params.imageId, storedPath: params.storedPath, ...params.logContext };
  logger.error('Signing failed for uploaded image, rolling back:', ctx);

  const { error: dbDeleteError } = await supabase
    .from(params.imagesTable)
    .delete()
    .eq('id', params.imageId);

  if (dbDeleteError) {
    logger.error(
      'Failed to delete DB row during signing-failure rollback; skipping storage cleanup to preserve consistency:',
      { ...ctx, error: dbDeleteError },
    );
    return;
  }

  try {
    await deleteImageFromStorage(params.bucket as StorageBucket, params.storedPath);
  } catch (cleanupError) {
    logger.error('Failed to delete orphaned storage object during rollback:', { ...ctx, error: cleanupError });
  }
}
