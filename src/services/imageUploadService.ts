/**
 * Shared Image Upload Service
 * 
 * DRY abstraction for uploading images to Supabase Storage buckets.
 * Used by organization logos, user avatars, team images, and inventory item images.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { requireAuthUserIdFromClaims } from '@/lib/authClaims';

export type StorageBucket =
  | 'organization-logos'
  | 'user-avatars'
  | 'team-images'
  | 'inventory-item-images'
  | 'work-order-images'
  | 'equipment-note-images';

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Compression settings used for technician-captured photos. The defaults
 * are tuned for slow cellular: a modern phone camera produces 8–12 MB JPEGs
 * at full resolution, which is unusable on a 1.5 Mbps uplink. Resizing to
 * 1600px on the long edge and re-encoding to ≤500 KB preserves enough
 * detail for equipment / work-order documentation while making the upload
 * complete in seconds.
 *
 * GIFs are skipped (animation would be lost) and small files under
 * `skipBelowKB` short-circuit so we don't waste CPU re-encoding a logo.
 */
export interface CompressionOptions {
  /** Approximate target in MB (compressor honors as upper bound). */
  maxSizeMB?: number;
  /** Long-edge resize target in pixels. */
  maxWidthOrHeight?: number;
  /** Skip compression entirely when the source file is below this size in KB. */
  skipBelowKB?: number;
  /** When true, run compression in a Web Worker (default). */
  useWebWorker?: boolean;
}

const DEFAULT_COMPRESSION: Required<CompressionOptions> = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1600,
  skipBelowKB: 200,
  useWebWorker: true,
};

/**
 * Compress an image file in the browser. Returns a new `File` that is
 * safe to pass to `uploadImageToStorage`. Falls back to the original file
 * (logged, not thrown) if compression is unsupported or fails — better to
 * upload a large file than to drop the user's data on the floor.
 *
 * GIFs are returned unchanged because the canvas-based compressor used
 * here flattens to a single frame.
 */
export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const settings = { ...DEFAULT_COMPRESSION, ...options };

  if (file.type === 'image/gif') {
    return file;
  }
  if (file.size <= settings.skipBelowKB * 1024) {
    return file;
  }

  try {
    const { default: imageCompression } = await import('browser-image-compression');
    const compressed = await imageCompression(file, {
      maxSizeMB: settings.maxSizeMB,
      maxWidthOrHeight: settings.maxWidthOrHeight,
      useWebWorker: settings.useWebWorker,
      // The compressor preserves the original MIME type when possible, so
      // PNG transparency survives. Quality is auto-adjusted to hit
      // `maxSizeMB`.
    });

    // Some browsers return a Blob without a `name` — preserve the original
    // filename so storage path generation continues to work.
    if (compressed instanceof File) {
      return compressed;
    }
    return new File([compressed], file.name, {
      type: compressed.type || file.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    logger.warn('Image compression failed; uploading original file', {
      error: error instanceof Error ? error.message : String(error),
      sizeBytes: file.size,
      type: file.type,
    });
    return file;
  }
}

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
 *
 * Behavior:
 *   - The file is compressed in the browser before upload by default. A
 *     phone-captured 12 MB JPEG drops to ≤500 KB, which is the difference
 *     between an upload that completes and one that times out on Slow 4G.
 *     Pass `compress: false` to opt out (e.g. when the caller has
 *     pre-processed the file or needs pixel-perfect fidelity such as
 *     logos).
 *   - When `upsert` is true the storage path stays the same across
 *     re-uploads, so Supabase's CDN (`cache-control: public, max-age=3600`)
 *     can serve a stale version. To bust the cache we append a
 *     `?v={timestamp}` query parameter to the URL stored in the DB.
 *     `extractStoragePath` strips query params before calling
 *     `storage.remove()` so deletions still work.
 */
export async function uploadImageToStorage(
  bucket: StorageBucket,
  filePath: string,
  file: File,
  options?: {
    upsert?: boolean;
    /** Disable compression (default: true). Logos / pixel-perfect uploads. */
    compress?: boolean;
    /** Override default compression settings. */
    compression?: CompressionOptions;
  }
): Promise<string> {
  const shouldCompress = options?.compress ?? true;
  const fileToUpload = shouldCompress
    ? await compressImageFile(file, options?.compression)
    : file;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileToUpload, {
      upsert: options?.upsert ?? false,
      contentType: fileToUpload.type,
    });

  if (uploadError) {
    logger.error('Error uploading image to storage:', uploadError);
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(uploadData.path);

  // Bust CDN cache for upserted files (same path, new content)
  if (options?.upsert) {
    return `${publicUrl}?v=${Date.now()}`;
  }

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
 *   {supabaseUrl}/storage/v1/object/public/{bucket}/{path}[?query]
 * 
 * Returns the {path} portion (without query params), or null if extraction fails.
 * Query params (e.g. `?v=...` cache-busters) are stripped so the path is safe
 * to pass to `storage.remove()`.
 */
export function extractStoragePath(
  publicUrl: string,
  bucket: StorageBucket
): string | null {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    const pathWithQuery = publicUrl.substring(idx + marker.length);
    // Strip query parameters (e.g. ?v=1234 cache-bust)
    const qIdx = pathWithQuery.indexOf('?');
    return qIdx === -1 ? pathWithQuery : pathWithQuery.substring(0, qIdx);
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user ID, or throw.
 */
export async function requireAuthUserId(): Promise<string> {
  return requireAuthUserIdFromClaims();
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
