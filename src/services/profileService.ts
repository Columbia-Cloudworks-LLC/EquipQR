/**
 * Profile Service - Upload/delete user avatar images
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import {
  uploadImageToStorage,
  deleteImageFromStorage,
  generateSingleFilePath,
  validateImageFile,
  resolveImageDisplayUrl,
} from '@/services/imageUploadService';

/**
 * Upload a user avatar to Supabase Storage and update the profiles table.
 * Returns a signed display URL for immediate UI use (canonical path is persisted).
 */
export const uploadAvatar = async (
  userId: string,
  file: File
): Promise<string> => {
  validateImageFile(file, 5);

  const filePath = generateSingleFilePath(userId, 'avatar', file);
  const storedPath = await uploadImageToStorage(
    'user-avatars',
    filePath,
    file,
    { upsert: true, compress: false }
  );

  // Update profiles table
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: storedPath, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    logger.error('Error updating avatar in DB:', error);
    // Clean up orphaned storage file since DB update failed
    try {
      await deleteImageFromStorage('user-avatars', storedPath);
    } catch (deleteError) {
      logger.error('Failed to delete orphaned avatar from storage:', deleteError);
    }
    throw new Error('Failed to save avatar');
  }

  return (await resolveImageDisplayUrl('user-avatars', storedPath)) ?? storedPath;
};

/**
 * Delete the user avatar from storage and clear the column.
 */
export const deleteAvatar = async (
  userId: string,
  currentAvatarUrl: string
): Promise<void> => {
  // Clear the DB column first so the UI never references a deleted file
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    logger.error('Error clearing avatar:', error);
    throw new Error('Failed to remove avatar');
  }

  // Best-effort storage cleanup — DB column is already cleared
  try {
    await deleteImageFromStorage('user-avatars', currentAvatarUrl);
  } catch (storageError) {
    logger.error('Failed to delete avatar from storage (DB already cleared):', storageError);
  }
};
