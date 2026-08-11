/**
 * Shared Image Upload Service
 *
 * DRY abstraction for uploading images to Supabase Storage buckets.
 * Private buckets persist canonical object paths in the database and rely on
 * short-lived signed URLs at read time. Public buckets (e.g. organization
 * logos) continue to use getPublicUrl(). Landing / marketing images use
 * `src/lib/landingImage.ts`, not this module.
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

const PRIVATE_STORAGE_SIGN_MARKERS = [
  '/storage/v1/object/sign/work-order-images/',
  '/storage/v1/object/sign/equipment-note-images/',
  '/storage/v1/object/sign/team-images/',
  '/storage/v1/object/sign/user-avatars/',
  '/storage/v1/object/sign/inventory-item-images/',
] as const;

function getSupabaseProjectOrigin(): string | null {
  const raw = import.meta.env.VITE_SUPABASE_URL?.trim();
  return raw ? raw.replace(/\/$/, '') : null;
}

/**
 * Local Supabase often returns signed URLs as `/object/sign/...` relatives.
 * Browsers resolve those against the Vite origin (8080), not Storage (54321).
 */
export function toAbsoluteSignedStorageUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const origin = getSupabaseProjectOrigin();
  if (!origin) return null;

  if (trimmed.startsWith('/storage/v1/object/')) {
    return `${origin}${trimmed}`;
  }
  if (trimmed.startsWith('/object/')) {
    return `${origin}/storage/v1${trimmed}`;
  }
  return null;
}

function normalizeSignedStorageUrlForChecks(url: string): string {
  return toAbsoluteSignedStorageUrl(url) ?? url.trim();
}

/**
 * True when `url` is (or was) a Supabase signed URL for an EquipQR private bucket.
 * Expired or orphaned signed URLs must not be used as `<img src>` fallbacks (#1171).
 */
export function isEquipQrPrivateStorageUrl(url: string): boolean {
  const normalized = normalizeSignedStorageUrlForChecks(url);
  return PRIVATE_STORAGE_SIGN_MARKERS.some((marker) => normalized.includes(marker));
}

/**
 * True when an absolute URL is safe to use as `<img src>` for a private bucket.
 * Supabase sign endpoints without a `?token=` query always 400 on GET (#1171).
 */
export function isFetchableSignedStorageUrl(url: string): boolean {
  const normalized = normalizeSignedStorageUrlForChecks(url);
  if (!/^https?:\/\//i.test(normalized)) return false;
  if (!isEquipQrPrivateStorageUrl(normalized)) return true;
  try {
    const token = new URL(normalized).searchParams.get('token');
    return typeof token === 'string' && token.length > 0;
  } catch {
    return false;
  }
}

/** Safe `<img src>` for resolved equipment/team/private-bucket display URLs. */
export function displayableImageSrc(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const absolute = toAbsoluteSignedStorageUrl(url.trim());
  if (!absolute) return null;
  return isFetchableSignedStorageUrl(absolute) ? absolute : null;
}

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

  const absolute = toAbsoluteSignedStorageUrl(data.signedUrl);
  if (!absolute || !isFetchableSignedStorageUrl(absolute)) {
    if (logFailures) {
      logger.error('createSignedUrl failed', { bucket, error: 'unsigned or relative signed URL' });
    }
    return null;
  }

  return absolute;
}

/**
 * Resolve many stored references for a private bucket with one `createSignedUrls` call.
 * Falls back to `createSignedUrlForPath` when the batch response omits a path or errors.
 */
async function batchResolveStoredRefsForPrivateBucket(
  bucket: StorageBucket,
  storedRefs: (string | null | undefined)[],
  batchLogLabel: string,
  options?: { expiresInSeconds?: number },
): Promise<(string | null)[]> {
  const expiresIn = options?.expiresInSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS;
  const results: (string | null)[] = storedRefs.map(() => null);

  type Pending = { idx: number; path: string; httpFallback: string | null };
  const pending: Pending[] = [];

  storedRefs.forEach((stored, idx) => {
    if (!stored?.trim()) return;

    const trimmed = stored.trim();
    const path = normalizeStoredObjectPath(trimmed, bucket);

    if (!path) {
      results[idx] = displayableImageSrc(trimmed);
      return;
    }

    const httpFallback = displayableImageSrc(trimmed);
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
        const absolute = toAbsoluteSignedStorageUrl(row.signedUrl);
        const url = absolute && isFetchableSignedStorageUrl(absolute) ? absolute : null;
        if (url) {
          signedByPath.set(row.path, url);
        }
      }
    }
  } else if (error) {
    logger.error(`createSignedUrls failed for ${batchLogLabel}`, { bucket, error });
  }

  await Promise.all(
    pending.map(async ({ idx, path, httpFallback }) => {
      let url = signedByPath.get(path) ?? null;
      if (!url) {
        url = await createSignedUrlForPath(bucket, path, {
          expiresInSeconds: expiresIn,
          logFailures: false,
        });
      }
      results[idx] = url ?? httpFallback;
    }),
  );

  return results;
}

/** Batch-sign `work-order-images` paths (one Storage round-trip when possible). */
export async function batchResolveWorkOrderImageDisplayUrls(
  storedRefs: (string | null | undefined)[],
  options?: { expiresInSeconds?: number },
): Promise<(string | null)[]> {
  return batchResolveStoredRefsForPrivateBucket(
    'work-order-images',
    storedRefs,
    'work-order-images batch',
    options,
  );
}

/**
 * Combine a signed/private URL with legacy absolute URLs only. Canonical bucket paths must not be
 * passed through as `<img src>` when signing fails.
 */
export function displayUrlForStoredPrivateImage(
  signedOrResolved: string | null | undefined,
  stored: string | null | undefined,
): string | null {
  if (signedOrResolved) {
    const absolute = toAbsoluteSignedStorageUrl(signedOrResolved) ?? signedOrResolved;
    return isFetchableSignedStorageUrl(absolute) ? absolute : null;
  }
  const s = String(stored ?? '').trim();
  if (/^https?:\/\//i.test(s)) {
    return isEquipQrPrivateStorageUrl(s) ? null : s;
  }
  return null;
}

/** Batch-sign `user-avatars` paths (one Storage round-trip when possible). */
export async function batchResolveUserAvatarDisplayUrls(
  storedRefs: (string | null | undefined)[],
  options?: { expiresInSeconds?: number },
): Promise<(string | null)[]> {
  return batchResolveStoredRefsForPrivateBucket(
    'user-avatars',
    storedRefs,
    'user-avatars batch',
    options,
  );
}

/** Batch-sign `team-images` paths (one Storage round-trip when possible). */
export async function batchResolveTeamImageDisplayUrls(
  storedRefs: (string | null | undefined)[],
  options?: { expiresInSeconds?: number },
): Promise<(string | null)[]> {
  return batchResolveStoredRefsForPrivateBucket(
    'team-images',
    storedRefs,
    'team-images batch',
    options,
  );
}

/** Batch-sign `equipment-note-images` paths (one Storage round-trip when possible). */
export async function batchResolveEquipmentNoteImageDisplayUrls(
  storedRefs: (string | null | undefined)[],
  options?: { expiresInSeconds?: number },
): Promise<(string | null)[]> {
  return batchResolveStoredRefsForPrivateBucket(
    'equipment-note-images',
    storedRefs,
    'equipment-note-images batch',
    options,
  );
}

/** Batch-sign `inventory-item-images` paths (one Storage round-trip when possible). */
export async function batchResolveInventoryItemImageDisplayUrls(
  storedRefs: (string | null | undefined)[],
  options?: { expiresInSeconds?: number },
): Promise<(string | null)[]> {
  return batchResolveStoredRefsForPrivateBucket(
    'inventory-item-images',
    storedRefs,
    'inventory-item-images batch',
    options,
  );
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
 * Batch-sign known-bucket paths with a single `createSignedUrls` POST.
 * Missing objects resolve to per-item errors inside a 200 response, so the
 * browser console is not flooded with individual 400s (#1156).
 */
type BatchSignResult = {
  signed: Map<string, string>;
  /** Paths the batch API reported as missing/invalid — do not probe individually (#1156). */
  errored: Set<string>;
};

async function batchSignPathsForBucket(
  bucket: StorageBucket,
  paths: string[],
  expiresIn: number,
): Promise<BatchSignResult> {
  const signed = new Map<string, string>();
  const errored = new Set<string>();
  if (paths.length === 0) return { signed, errored };

  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresIn);
  if (error || !data) {
    if (error) {
      logger.error('createSignedUrls failed for equipment display batch', { bucket, error });
    }
    return { signed, errored };
  }

  for (const row of data) {
    if (row.error) {
      if (row.path) errored.add(row.path);
      continue;
    }
    if (row.path && row.signedUrl) {
      const absolute = toAbsoluteSignedStorageUrl(row.signedUrl);
      if (absolute && isFetchableSignedStorageUrl(absolute)) {
        signed.set(row.path, absolute);
      }
    }
  }
  return { signed, errored };
}

/**
 * Resolve many equipment display image references.
 *
 * When the caller supplies `equipmentIds` (aligned with `storedRefs`), the
 * owning bucket is derived from the path layout — equipment-note uploads are
 * `{userId}/{equipmentId}/{noteId}/{file}` while work-order uploads embed the
 * work order id in the second segment — so each path is signed against a
 * single bucket via one batch call per bucket (no wrong-bucket 400 probes).
 *
 * Ambiguous refs (no equipment id supplied) fall back to individual
 * `createSignedUrl` probes on the work-order bucket, then equipment-note.
 * The batch API cannot be used for probing because it returns per-item rows
 * for every path regardless of which bucket actually owns the object.
 */
export async function batchResolveEquipmentDisplayImageUrls(
  storedRefs: (string | null | undefined)[],
  options?: {
    expiresInSeconds?: number;
    /** Equipment ids aligned with `storedRefs`; enables single-bucket signing. */
    equipmentIds?: (string | null | undefined)[];
  }
): Promise<(string | null)[]> {
  const expiresIn = options?.expiresInSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS;
  const equipmentIds = options?.equipmentIds;
  const results: (string | null)[] = storedRefs.map(() => null);

  type Pending = { idx: number; path: string; stored: string; bucket: StorageBucket | null };
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
      results[idx] = displayableImageSrc(trimmed);
      return;
    }

    const path = extractEquipmentDisplayImagePath(trimmed);
    if (!path) {
      results[idx] = displayableImageSrc(trimmed);
      return;
    }

    // Bucket resolution order: a stored public/signed URL that names its
    // bucket is authoritative; bare canonical paths use the known equipment
    // id (note-image uploads embed it as the second segment); otherwise the
    // ref stays ambiguous and falls back to per-bucket probing.
    let bucket: StorageBucket | null = null;
    if (woNorm && !eqNorm) {
      bucket = 'work-order-images';
    } else if (eqNorm && !woNorm) {
      bucket = 'equipment-note-images';
    } else {
      const equipmentId = equipmentIds?.[idx]?.trim();
      if (equipmentId) {
        bucket = path.split('/')[1] === equipmentId ? 'equipment-note-images' : 'work-order-images';
      }
    }

    pending.push({ idx, path, stored: trimmed, bucket });
  });

  if (pending.length === 0) {
    return results;
  }

  const notePaths = [...new Set(pending.filter(p => p.bucket === 'equipment-note-images').map(p => p.path))];
  const woPaths = [...new Set(pending.filter(p => p.bucket === 'work-order-images').map(p => p.path))];

  const [noteBatch, woBatch] = await Promise.all([
    batchSignPathsForBucket('equipment-note-images', notePaths, expiresIn),
    batchSignPathsForBucket('work-order-images', woPaths, expiresIn),
  ]);
  const noteSigned = noteBatch.signed;
  const woSigned = woBatch.signed;
  const batchErroredPaths = new Set([...noteBatch.errored, ...woBatch.errored]);

  const ambiguousPaths = [...new Set(pending.filter(p => p.bucket === null).map(p => p.path))];
  const probed = new Map<string, string>();
  if (ambiguousPaths.length > 0) {
    const woProbe = await Promise.all(
      ambiguousPaths.map(p =>
        createSignedUrlForPath('work-order-images', p, {
          expiresInSeconds: expiresIn,
          logFailures: false,
        }),
      ),
    );
    ambiguousPaths.forEach((p, i) => {
      const url = woProbe[i];
      if (url) probed.set(p, url);
    });

    const needEq = ambiguousPaths.filter(p => !probed.has(p));
    if (needEq.length > 0) {
      const eqProbe = await Promise.all(
        needEq.map(p =>
          createSignedUrlForPath('equipment-note-images', p, {
            expiresInSeconds: expiresIn,
            logFailures: false,
          }),
        ),
      );
      needEq.forEach((p, i) => {
        const url = eqProbe[i];
        if (url) probed.set(p, url);
      });
    }
  }

  await Promise.all(
    pending.map(async ({ idx, path, bucket }) => {
      let url =
        (bucket === 'equipment-note-images' ? noteSigned.get(path) : undefined) ??
        (bucket === 'work-order-images' ? woSigned.get(path) : undefined) ??
        (bucket === null ? probed.get(path) : undefined) ??
        null;

      if (!url && bucket && !batchErroredPaths.has(path)) {
        url = await createSignedUrlForPath(bucket, path, {
          expiresInSeconds: expiresIn,
          logFailures: false,
        });
      }

      results[idx] = url;
    }),
  );

  return results;
}

export async function withResolvedEquipmentImages<
  T extends { id?: string; image_url?: string | null },
>(rows: T[]): Promise<T[]> {
  const urls = await batchResolveEquipmentDisplayImageUrls(
    rows.map(row => row.image_url ?? null),
    { equipmentIds: rows.map(row => row.id ?? null) },
  );
  return rows.map((row, index) => ({
    ...row,
    image_url: urls[index] ?? null,
  }));
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

function pathAfterStorageMarker(url: string, markers: readonly string[]): string | null {
  for (const marker of markers) {
    const idx = url.indexOf(marker);
    if (idx === -1) continue;
    const pathWithQuery = url.substring(idx + marker.length);
    const qIdx = pathWithQuery.indexOf('?');
    return qIdx === -1 ? pathWithQuery : pathWithQuery.substring(0, qIdx);
  }
  return null;
}

function extractPublicStoragePath(url: string, bucket: StorageBucket): string | null {
  try {
    // Absolute `/storage/v1/...` and local relative `/object/...` forms
    return pathAfterStorageMarker(url, [
      `/storage/v1/object/public/${bucket}/`,
      `/object/public/${bucket}/`,
    ]);
  } catch {
    return null;
  }
}

function extractSignedStoragePath(url: string, bucket: StorageBucket): string | null {
  try {
    return pathAfterStorageMarker(url, [
      `/storage/v1/object/sign/${bucket}/`,
      `/object/sign/${bucket}/`,
    ]);
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
