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

/** Image files carried by a paste event, with clipboard screenshots given a usable name. */
export function extractPastedImages(clipboardData: DataTransfer | null): File[] {
  if (!clipboardData) return [];
  const files: File[] = [];
  for (const item of Array.from(clipboardData.items)) {
    if (!item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (!file) continue;
    files.push(
      file.name && file.name !== 'image.png'
        ? file
        : new File([file], `pasted-image-${Date.now()}.${file.type.split('/')[1] || 'png'}`, {
            type: file.type,
          }),
    );
  }
  return files;
}
