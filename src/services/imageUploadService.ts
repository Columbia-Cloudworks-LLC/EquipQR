/**
 * Shared Image Upload Service
 * 
 * DRY abstraction for uploading images to Supabase Storage buckets.
 * Used by organization logos, user avatars, team images, and inventory item images.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export type StorageBucket =
  | 'organization-logos'
  | 'user-avatars'
  | 'team-images'
  | 'inventory-item-images'
  | 'work-order-images'
  | 'equipment-note-images';

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Generate a standardized file path for storage uploads.
 * Convention: {prefix}/{entityId}/{timestamp}.{ext}
 */
export function generateFilePath(
  prefix: string,
  entityId: string,
  file: File
): string {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  return `${prefix}/${entityId}/${Date.now()}.${fileExt}`;
}

/**
 * Generate a deterministic file path for single-image entities (logos, avatars).
 * The path is stable so re-uploads overwrite the previous file.
 * Convention: {entityId}/{label}.{ext}
 */
export function generateSingleFilePath(
  entityId: string,
  label: string,
  file: File
): string {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  return `${entityId}/${label}.${fileExt}`;
}

/**
 * Validate a file before upload (MIME type and size).
 * Throws an error if validation fails.
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 10
): void {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `Unsupported file type: ${file.type}. Accepted types: JPEG, PNG, GIF, WebP.`
    );
  }
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum size is ${maxSizeMB} MB.`
    );
  }
}

/**
 * Upload a single image to a Supabase Storage bucket.
 * Returns the public URL of the uploaded file.
 */
export async function uploadImageToStorage(
  bucket: StorageBucket,
  filePath: string,
  file: File,
  options?: { upsert?: boolean }
): Promise<string> {
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      upsert: options?.upsert ?? false,
      contentType: file.type,
    });

  if (uploadError) {
    logger.error('Error uploading image to storage:', uploadError);
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(uploadData.path);

  return publicUrl;
}

/**
 * Delete a single image from a Supabase Storage bucket.
 * Extracts the storage path from a public URL.
 */
export async function deleteImageFromStorage(
  bucket: StorageBucket,
  publicUrl: string
): Promise<void> {
  const storagePath = extractStoragePath(publicUrl, bucket);
  if (!storagePath) {
    logger.error('Could not extract storage path from URL:', { publicUrl, bucket });
    return;
  }

  const { error } = await supabase.storage
    .from(bucket)
    .remove([storagePath]);

  if (error) {
    logger.error('Error deleting image from storage:', error);
    // Don't throw — storage cleanup failure shouldn't block the operation
  }
}

/**
 * Delete multiple images from a Supabase Storage bucket.
 */
export async function deleteImagesFromStorage(
  bucket: StorageBucket,
  publicUrls: string[]
): Promise<void> {
  const paths = publicUrls
    .map(url => extractStoragePath(url, bucket))
    .filter((p): p is string => !!p);

  if (paths.length === 0) return;

  const { error } = await supabase.storage
    .from(bucket)
    .remove(paths);

  if (error) {
    logger.error('Error deleting images from storage:', error);
  }
}

/**
 * Extract the storage object path from a Supabase public URL.
 * 
 * Public URL format: 
 *   {supabaseUrl}/storage/v1/object/public/{bucket}/{path}
 * 
 * Returns the {path} portion, or null if extraction fails.
 */
export function extractStoragePath(
  publicUrl: string,
  bucket: StorageBucket
): string | null {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.substring(idx + marker.length);
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user ID, or throw.
 */
export async function requireAuthUserId(): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('User not authenticated');
  }
  return userData.user.id;
}

/**
 * Get the current user's profile name for denormalization.
 */
export async function getCurrentUserName(userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .single();
  return profile?.name || 'Unknown';
}
