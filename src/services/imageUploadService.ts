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
    logger.error('Image compression failed; uploading original file', {
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

export interface CreateSignedUrlForPathOptions {
  expiresInSeconds?: number;
  /** When false, skips logging (e.g. expected miss during multi-bucket fallback). */
  logFailures?: boolean;
}

/**
 * Create a signed URL for an object path inside a private bucket.
 */
export async function createSignedUrlForPath(
  bucket: StorageBucket,
  objectPath: string,
  options?: CreateSignedUrlForPathOptions
): Promise<string | null> {
  const trimmed = objectPath.trim();
  if (!trimmed) return null;

  const expiresInSeconds = options?.expiresInSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS;
  const logFailures = options?.logFailures ?? true;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(trimmed, expiresInSeconds);

  if (error || !data?.signedUrl) {
    if (logFailures) {
      logger.error('createSignedUrl failed', { bucket, error });
    }
    return null;
  }

  return data.signedUrl;
}

/**
 * Resolve many `work-order-images` references with one Storage `createSignedUrls` call.
 * Falls back to `createSignedUrlForPath` when the batch response omits a path or errors.
 */
export async function batchResolveWorkOrderImageDisplayUrls(
  storedRefs: (string | null | undefined)[],
  options?: { expiresInSeconds?: number }
): Promise<(string | null)[]> {
  const bucket: StorageBucket = 'work-order-images';
  const expiresIn = options?.expiresInSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS;
  const results: (string | null)[] = storedRefs.map(() => null);

  type Pending = { idx: number; path: string; httpFallback: string | null };
  const pending: Pending[] = [];

  storedRefs.forEach((stored, idx) => {
    if (!stored?.trim()) return;

    const trimmed = stored.trim();
    const path = normalizeStoredObjectPath(trimmed, bucket);

    if (!path) {
      results[idx] = /^https?:\/\//i.test(trimmed) ? trimmed : null;
      return;
    }

    const httpFallback = /^https?:\/\//i.test(trimmed) ? trimmed : null;
    pending.push({ idx, path, httpFallback });
  });

  if (pending.length === 0) {
    return results;
  }

  const uniquePaths = [...new Set(pending.map(p => p.path))];
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(uniquePaths, expiresIn);

  const signedByPath = new Map<string, string>();
  if (!error && data) {
    for (const row of data) {
      if (row.path && row.signedUrl) {
        signedByPath.set(row.path, row.signedUrl);
      }
    }
  } else if (error) {
    logger.error('createSignedUrls failed for work-order-images batch', { error });
  }

  await Promise.all(
    pending.map(async ({ idx, path, httpFallback }) => {
      let url = signedByPath.get(path) ?? null;
      if (!url) {
        url = await createSignedUrlForPath(bucket, path, {
          expiresInSeconds: expiresIn,
          logFailures: true,
        });
      }
      results[idx] = url ?? httpFallback;
    }),
  );

  return results;
}

/**
 * Combine a signed/private URL with legacy absolute URLs only. Canonical bucket paths must not be
 * passed through as `<img src>` when signing fails.
 */
export function displayUrlForStoredPrivateImage(
  signedOrResolved: string | null | undefined,
  stored: string | null | undefined,
): string | null {
  if (signedOrResolved) return signedOrResolved;
  const s = String(stored ?? '').trim();
  if (/^https?:\/\//i.test(s)) return s;
  return null;
}

/**
 * Resolve many `user-avatars` references with one Storage `createSignedUrls` call.
 */
export async function batchResolveUserAvatarDisplayUrls(
  storedRefs: (string | null | undefined)[],
  options?: { expiresInSeconds?: number },
): Promise<(string | null)[]> {
  const bucket: StorageBucket = 'user-avatars';
  const expiresIn = options?.expiresInSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS;
  const results: (string | null)[] = storedRefs.map(() => null);

  type Pending = { idx: number; path: string; httpFallback: string | null };
  const pending: Pending[] = [];

  storedRefs.forEach((stored, idx) => {
    if (!stored?.trim()) return;

    const trimmed = stored.trim();
    const path = normalizeStoredObjectPath(trimmed, bucket);

    if (!path) {
      results[idx] = /^https?:\/\//i.test(trimmed) ? trimmed : null;
      return;
    }

    const httpFallback = /^https?:\/\//i.test(trimmed) ? trimmed : null;
    pending.push({ idx, path, httpFallback });
  });

  if (pending.length === 0) {
    return results;
  }

  const uniquePaths = [...new Set(pending.map(p => p.path))];
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(uniquePaths, expiresIn);

  const signedByPath = new Map<string, string>();
  if (!error && data) {
    for (const row of data) {
      if (row.path && row.signedUrl) {
        signedByPath.set(row.path, row.signedUrl);
      }
    }
  } else if (error) {
    logger.error('createSignedUrls failed for user-avatars batch', { error });
  }

  await Promise.all(
    pending.map(async ({ idx, path, httpFallback }) => {
      let url = signedByPath.get(path) ?? null;
      if (!url) {
        url = await createSignedUrlForPath(bucket, path, {
          expiresInSeconds: expiresIn,
          logFailures: true,
        });
      }
      results[idx] = url ?? httpFallback;
    }),
  );

  return results;
}

/**
 * Normalize an equipment `image_url` reference to a single bucket-relative path.
 * Used before batch or single-bucket signing (ambiguous paths may exist in WO or note buckets).
 */
export function extractEquipmentDisplayImagePath(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null;

  return (
    normalizeStoredObjectPath(stored, 'work-order-images') ??
    normalizeStoredObjectPath(stored, 'equipment-note-images') ??
    (!/^https?:\/\//i.test(stored)
      ? stored.trim().split('?')[0]?.replace(/^\/+/, '') ?? null
      : null)
  );
}

/**
 * Resolve many equipment display image references with parallel per-path signing on the
 * work-order bucket, then parallel signing on equipment-note for paths missing from WO.
 *
 * Uses individual `createSignedUrl` calls (not batch `createSignedUrls`) because the batch
 * API returns a signed URL for every path regardless of object existence, which breaks
 * fallback to the equipment-note bucket.
 */
export async function batchResolveEquipmentDisplayImageUrls(
  storedRefs: (string | null | undefined)[],
  options?: { expiresInSeconds?: number }
): Promise<(string | null)[]> {
  const expiresIn = options?.expiresInSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS;
  const results: (string | null)[] = storedRefs.map(() => null);

  type Pending = { idx: number; path: string; stored: string };
  const pending: Pending[] = [];

  storedRefs.forEach((stored, idx) => {
    if (!stored?.trim()) {
      results[idx] = null;
      return;
    }

    const trimmed = stored.trim();
    const woNorm = normalizeStoredObjectPath(trimmed, 'work-order-images');
    const eqNorm = normalizeStoredObjectPath(trimmed, 'equipment-note-images');
    if (/^https?:\/\//i.test(trimmed) && !woNorm && !eqNorm) {
      results[idx] = trimmed;
      return;
    }

    const path = extractEquipmentDisplayImagePath(trimmed);
    if (!path) {
      results[idx] = /^https?:\/\//i.test(trimmed) ? trimmed : null;
      return;
    }

    pending.push({ idx, path, stored: trimmed });
  });

  if (pending.length === 0) {
    return results;
  }

  const uniquePaths = [...new Set(pending.map(p => p.path))];

  const woResults = await Promise.all(
    uniquePaths.map(p =>
      createSignedUrlForPath('work-order-images', p, {
        expiresInSeconds: expiresIn,
        logFailures: false,
      }),
    ),
  );
  const woSigned = new Map<string, string>();
  uniquePaths.forEach((p, i) => {
    const url = woResults[i];
    if (url) woSigned.set(p, url);
  });

  const needEq = uniquePaths.filter(p => !woSigned.has(p));
  const eqSigned = new Map<string, string>();
  if (needEq.length > 0) {
    const eqResults = await Promise.all(
      needEq.map(p =>
        createSignedUrlForPath('equipment-note-images', p, {
          expiresInSeconds: expiresIn,
          logFailures: false,
        }),
      ),
    );
    needEq.forEach((p, i) => {
      const url = eqResults[i];
      if (url) eqSigned.set(p, url);
    });
  }

  for (const { idx, path, stored } of pending) {
    const url = woSigned.get(path) ?? eqSigned.get(path) ?? null;
    if (url) {
      results[idx] = url;
    } else {
      results[idx] = stored.startsWith('http') ? stored : null;
    }
  }

  return results;
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
      const trimmed = stored.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        const extracted = extractPublicStoragePath(trimmed, bucket);
        if (extracted === path) return trimmed;
      }
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

  return createSignedUrlForPath(bucket, path, { expiresInSeconds: expiresIn });
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
