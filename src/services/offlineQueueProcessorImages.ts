import { deleteOfflineImageRefs, loadOfflineImageFiles } from './offlineBlobStore';
import type {
  OfflineQueueImageRef,
  OfflineQueueItem,
  OfflineQueuedWorkOrderCreatePayload,
} from './offlineQueueService';
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
  if (item.type === 'work_order_create') {
    const payload = item.payload as OfflineQueuedWorkOrderCreatePayload;
    if (payload.imageRefs?.length && payload.creationImagesSynced !== true) {
      return;
    }
  }

  const refs = OfflineQueueService.collectImageRefsFromItem(item);
  if (refs.length) {
    await deleteOfflineImageRefs(userId, orgId, refs);
  }
}
