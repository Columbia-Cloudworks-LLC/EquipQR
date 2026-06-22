/**
 * Image reference metadata stored in offline queue JSON payloads.
 * Binary data lives in offlineBlobStore — never in localStorage queue JSON.
 */

import type { OfflineQueueImageRef } from './offlineQueueService';
import { stageOfflineImages } from './offlineBlobStore';

/** Build imageRefs metadata from staged blob ids + source files. */
export function buildImageRefs(refIds: string[], files: File[]): OfflineQueueImageRef[] {
  return refIds.map((blobKey, index) => ({
    blobKey,
    fileName: files[index]?.name ?? `photo-${index + 1}.jpg`,
    mimeType: files[index]?.type ?? 'image/jpeg',
    sizeBytes: files[index]?.size ?? 0,
  }));
}

/** Stage files and return metadata safe to embed in queue payloads. */
export async function stageQueueImageRefs(
  userId: string,
  orgId: string,
  files: File[],
): Promise<OfflineQueueImageRef[]> {
  if (files.length === 0) return [];
  const refIds = await stageOfflineImages(userId, orgId, files);
  return buildImageRefs(refIds, files);
}

export function collectImageRefIds(
  refs: OfflineQueueImageRef[] | undefined,
): string[] {
  return refs?.map((ref) => ref.blobKey) ?? [];
}
