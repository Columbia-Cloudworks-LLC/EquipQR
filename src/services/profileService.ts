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
} from '@/services/imageUploadService';

/**
 * Upload a user avatar to Supabase Storage and update the profiles table.
 * Returns the public URL of the uploaded avatar.
 */
export const uploadAvatar = async (
  userId: string,
  file: File
): Promise<string> => {
  validateImageFile(file, 5);

  const filePath = generateSingleFilePath(userId, 'avatar', file);
  const publicUrl = await uploadImageToStorage(
    'user-avatars',
    filePath,
    file,
    { upsert: true }
  );

  // Update profiles table
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    logger.error('Error updating avatar in DB:', error);
    throw new Error('Failed to save avatar');
  }

  return publicUrl;
};

/**
 * Delete the user avatar from storage and clear the column.
 */
export const deleteAvatar = async (
  userId: string,
  currentAvatarUrl: string
): Promise<void> => {
  // Remove from storage (best-effort)
  await deleteImageFromStorage('user-avatars', currentAvatarUrl);

  // Clear the avatar_url column
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    logger.error('Error clearing avatar:', error);
    throw new Error('Failed to remove avatar');
  }
};
