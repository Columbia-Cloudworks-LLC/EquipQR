import { deleteOfflineImageRefs, loadOfflineImageFiles } from './offlineBlobStore';
import type { OfflineQueueImageRef, OfflineQueueItem } from './offlineQueueService';
import { OfflineQueueService } from './offlineQueueService';

export async function loadQueueItemImageFiles(
  userId: string,
  orgId: string,
  imageRefs: OfflineQueueImageRef[] | undefined,
): Promise<File[]> {
  if (!imageRefs?.length) return [];
  return loadOfflineImageFiles(
    userId,
    orgId,
    imageRefs.map((ref) => ref.blobKey),
  );
}

export async function cleanupQueueItemBlobs(
  userId: string,
  orgId: string,
  item: OfflineQueueItem,
): Promise<void> {
  const refs = OfflineQueueService.collectImageRefsFromItem(item);
  if (refs.length) {
    await deleteOfflineImageRefs(userId, orgId, refs);
  }
}
