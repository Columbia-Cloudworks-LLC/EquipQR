import { toast } from 'sonner';

/** Matches InlineNoteComposer defaults for work-order evidence photos */
export const WORK_ORDER_CREATION_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export const WORK_ORDER_CREATION_MAX_IMAGES = 5;
export const WORK_ORDER_CREATION_MAX_FILE_BYTES = 10 * 1024 * 1024;

export const OFFLINE_CREATION_PHOTOS_MESSAGE =
  'Photos need a connection. Text notes can still be saved offline.';

/**
 * Validates incoming files for creation-time work order photos.
 * Shows toast errors for rejections. Returns files safe to append.
 */
export function validateAndAppendWorkOrderCreationImages(
  existing: File[],
  incoming: File[],
): File[] {
  const accepted = new Set<string>(WORK_ORDER_CREATION_IMAGE_TYPES);
  const next = [...existing];

  for (const file of incoming) {
    if (!accepted.has(file.type)) {
      toast.error(`${file.name} is not a supported image format`);
      continue;
    }
    if (file.size > WORK_ORDER_CREATION_MAX_FILE_BYTES) {
      toast.error(
        `${file.name} is too large. Maximum size is ${(WORK_ORDER_CREATION_MAX_FILE_BYTES / 1024 / 1024).toFixed(0)}MB`,
      );
      continue;
    }
    if (next.length >= WORK_ORDER_CREATION_MAX_IMAGES) {
      toast.error(`Maximum ${WORK_ORDER_CREATION_MAX_IMAGES} images allowed`);
      break;
    }
    next.push(file);
  }

  return next;
}
