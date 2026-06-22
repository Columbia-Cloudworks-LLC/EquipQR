/**
 * IndexedDB blob store for offline queue photo attachments.
 *
 * Blobs are stored outside the JSON localStorage queue so large images do
 * not blow the 50 KB/item JSON limit. Keys are scoped by user + org.
 */

import { get, set, del, keys, delMany } from 'idb-keyval';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { validateImageFile } from '@/services/imageUploadService';

const STORE_PREFIX = 'equipqr-offline-blob';

export interface OfflineBlobRecord {
  blob: Blob;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
}

export class OfflineBlobStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineBlobStoreError';
  }
}

function scopedPrefix(userId: string, orgId: string): string {
  return `${STORE_PREFIX}:${userId}:${orgId}:`;
}

function blobKey(userId: string, orgId: string, refId: string): string {
  return `${scopedPrefix(userId, orgId)}${refId}`;
}

/**
 * Persist image files for a queue item. Returns stable blob reference ids.
 */
export async function stageOfflineImages(
  userId: string,
  orgId: string,
  files: File[],
): Promise<string[]> {
  const refs: string[] = [];

  for (const file of files) {
    validateImageFile(file);
    const refId = crypto.randomUUID();
    const key = blobKey(userId, orgId, refId);

    try {
      await set(key, {
        blob: file,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        createdAt: Date.now(),
      } satisfies OfflineBlobRecord);
      refs.push(refId);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        toast.error('Photo storage full', {
          description:
            'Cannot save photos offline. Free device storage or sync when online. Your text note was not discarded.',
        });
        throw new OfflineBlobStoreError('IndexedDB quota exceeded while staging offline photos');
      }
      logger.error('Failed to stage offline photo blob', error);
      throw new OfflineBlobStoreError('Failed to stage offline photo');
    }
  }

  return refs;
}

/** Load staged blobs as File objects for replay upload. */
export async function loadOfflineImageFiles(
  userId: string,
  orgId: string,
  refIds: string[],
): Promise<File[]> {
  const files: File[] = [];

  for (const refId of refIds) {
    const record = await get<OfflineBlobRecord>(blobKey(userId, orgId, refId));
    if (!record?.blob) {
      throw new OfflineBlobStoreError(`Missing offline photo blob: ${refId}`);
    }
    files.push(
      new File([record.blob], record.fileName, {
        type: record.mimeType || record.blob.type,
        lastModified: record.createdAt,
      }),
    );
  }

  return files;
}

/** Best-effort cleanup after a queue item (and its blobs) syncs or is removed. */
export async function deleteOfflineImageRefs(
  userId: string,
  orgId: string,
  refIds: string[],
): Promise<void> {
  await Promise.all(
    refIds.map(async (refId) => {
      try {
        await del(blobKey(userId, orgId, refId));
      } catch {
        // best-effort
      }
    }),
  );
}

/** Remove all blobs for a user across every org scope (sign-out cleanup). */
export async function clearOfflineBlobsForUser(userId: string): Promise<void> {
  const prefix = `${STORE_PREFIX}:${userId}:`;
  try {
    const allKeys = await keys<IDBValidKey>();
    const scoped = allKeys.filter(
      (k): k is string => typeof k === 'string' && k.startsWith(prefix),
    );
    if (scoped.length) {
      await delMany(scoped);
    }
  } catch {
    // best-effort
  }
}
