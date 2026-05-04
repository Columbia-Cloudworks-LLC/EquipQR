/**
 * Shared Image Upload Service
 *
 * DRY abstraction for uploading images to Supabase Storage buckets.
 * Private buckets persist canonical object paths in the database and rely on
 * short-lived signed URLs at read time. Public buckets (organization logos,
 * landing-page marketing assets) continue to use getPublicUrl().
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

/** Buckets that remain publicly readable via `getPublicUrl` (no signing). */
export const PUBLIC_STORAGE_BUCKETS: ReadonlySet<StorageBucket> = new Set([
  'organization-logos',
]);

/** Default signed URL TTL — within the 5–15 minute compliance window. */
export const DEFAULT_SIGNED_URL_TTL_SECONDS = 900;

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function isPublicStorageBucket(bucket: StorageBucket): boolean {
  return PUBLIC_STORAGE_BUCKETS.has(bucket);
}

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
    });

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
 *
 * Returns:
 * - **Public buckets**: full public URL (optional `?v=` cache-buster when upserting).
 * - **Private buckets**: canonical object path inside the bucket (for DB storage).
 *
 * When `upsert` is true on **public** buckets, a `?v={timestamp}` query parameter
 * busts CDN caches. Private buckets omit query strings — readers use signed URLs.
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

  if (isPublicStorageBucket(bucket)) {
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(uploadData.path);

    if (options?.upsert) {
      return `${publicUrl}?v=${Date.now()}`;
    }

    return publicUrl;
  }

  return uploadData.path;
}

/**
 * Create a signed URL for an object path inside a private bucket.
 */
export async function createSignedUrlForPath(
  bucket: StorageBucket,
  objectPath: string,
  expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  const trimmed = objectPath.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(trimmed, expiresInSeconds);

  if (error || !data?.signedUrl) {
    logger.error('createSignedUrl failed', { bucket, error });
    return null;
  }

  return data.signedUrl;
}

/**
 * Normalize a stored file reference (legacy public URL, signed URL, or canonical path)
 * to the storage object path for the given bucket.
 */
export function normalizeStoredObjectPath(
  stored: string,
  bucket: StorageBucket
): string | null {
  const trimmed = stored.trim();
  if (!trimmed) return null;

  const publicPath = extractPublicStoragePath(trimmed, bucket);
  if (publicPath) return publicPath;

  const signedPath = extractSignedStoragePath(trimmed, bucket);
  if (signedPath) return signedPath;

  if (!/^https?:\/\//i.test(trimmed)) {
    const noQuery = trimmed.includes('?') ? trimmed.split('?')[0] : trimmed;
    return noQuery.replace(/^\/+/, '');
  }

  return null;
}

/**
 * Resolve a stored reference to a browser-fetchable URL (public URL or signed).
 * External HTTP URLs are returned unchanged when they do not match our patterns.
 */
export async function resolveImageDisplayUrl(
  bucket: StorageBucket,
  stored: string | null | undefined,
  options?: { expiresInSeconds?: number }
): Promise<string | null> {
  if (!stored?.trim()) return null;

  const expiresIn = options?.expiresInSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS;

  if (isPublicStorageBucket(bucket)) {
    const path = normalizeStoredObjectPath(stored, bucket);
    if (path) {
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(path);
      return publicUrl;
    }
    if (stored.startsWith('http')) return stored;
    return null;
  }

  const path = normalizeStoredObjectPath(stored, bucket);
  if (!path) {
    return stored.startsWith('http') ? stored : null;
  }

  return createSignedUrlForPath(bucket, path, expiresIn);
}

/**
 * Equipment `image_url` may reference either work-order or equipment-note buckets.
 * Path-only rows are ambiguous; we try signing against each bucket in order.
 */
export async function resolveEquipmentDisplayImageUrl(
  stored: string | null | undefined,
  options?: { expiresInSeconds?: number }
): Promise<string | null> {
  if (!stored?.trim()) return null;

  const expiresIn = options?.expiresInSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS;

  const path =
    normalizeStoredObjectPath(stored, 'work-order-images') ??
    normalizeStoredObjectPath(stored, 'equipment-note-images') ??
    (!/^https?:\/\//i.test(stored)
      ? stored.trim().split('?')[0]?.replace(/^\/+/, '') ?? null
      : null);

  if (!path) {
    return stored.startsWith('http') ? stored : null;
  }

  const wo = await createSignedUrlForPath('work-order-images', path, expiresIn);
  if (wo) return wo;

  const eq = await createSignedUrlForPath('equipment-note-images', path, expiresIn);
  if (eq) return eq;

  return stored.startsWith('http') ? stored : null;
}

/**
 * Delete a single image from a Supabase Storage bucket.
 */
export async function deleteImageFromStorage(
  bucket: StorageBucket,
  storedReference: string
): Promise<void> {
  const storagePath = normalizeStoredObjectPath(storedReference, bucket);
  if (!storagePath) {
    logger.error('Could not extract storage path:', { storedReference, bucket });
    return;
  }

  const { error } = await supabase.storage.from(bucket).remove([storagePath]);

  if (error) {
    logger.error('Error deleting image from storage:', error);
  }
}

/**
 * Delete multiple images from a Supabase Storage bucket.
 */
export async function deleteImagesFromStorage(
  bucket: StorageBucket,
  storedReferences: string[]
): Promise<void> {
  const paths = storedReferences
    .map(ref => normalizeStoredObjectPath(ref, bucket))
    .filter((p): p is string => !!p);

  if (paths.length === 0) return;

  const { error } = await supabase.storage.from(bucket).remove(paths);

  if (error) {
    logger.error('Error deleting images from storage:', error);
  }
}

/**
 * Extract the storage object path from a Supabase **public** object URL.
 *
 * Returns the path portion (without query params), or null if extraction fails.
 */
export function extractStoragePath(
  publicUrl: string,
  bucket: StorageBucket
): string | null {
  return extractPublicStoragePath(publicUrl, bucket);
}

function extractPublicStoragePath(url: string, bucket: StorageBucket): string | null {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    const pathWithQuery = url.substring(idx + marker.length);
    const qIdx = pathWithQuery.indexOf('?');
    return qIdx === -1 ? pathWithQuery : pathWithQuery.substring(0, qIdx);
  } catch {
    return null;
  }
}

function extractSignedStoragePath(url: string, bucket: StorageBucket): string | null {
  try {
    const marker = `/storage/v1/object/sign/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    let rest = url.substring(idx + marker.length);
    const qIdx = rest.indexOf('?');
    if (qIdx !== -1) rest = rest.substring(0, qIdx);
    return rest;
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
