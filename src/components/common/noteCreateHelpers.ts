import { toast } from 'sonner';
import type { QueuedNoteCreateResult } from '@/components/common/noteSubmitTypes';
import type { NoteCreateMutationInput } from '@/components/common/noteCreateMutationTypes';
import { logger } from '@/utils/logger';

/** Whether note creation should use the offline queue path (text-only when offline). */
export type { NoteCreateMutationInput };

export async function runOfflineAwareNoteCreate<TData>(options: {
  input: NoteCreateMutationInput;
  organizationId: string | undefined;
  userId: string | undefined;
  offlineCreate: (
    input: NoteCreateMutationInput,
  ) => Promise<{ queuedOffline: true; hadImages: boolean } | { queuedOffline: false; data: TData }>;
  onlineCreate: (input: NoteCreateMutationInput) => Promise<TData>;
  requireOrganization?: boolean;
}): Promise<{ queuedOffline: true; hadImages: boolean } | { queuedOffline: false; data: TData }> {
  const { input, organizationId, userId, offlineCreate, onlineCreate, requireOrganization = true } = options;

  if (requireOrganization && !organizationId) {
    throw new Error('No active organization selected');
  }

  if (shouldUseOfflineNotePath(input.images) && organizationId && userId) {
    return offlineCreate(input);
  }

  const data = await onlineCreate(input);
  return { queuedOffline: false, data };
}

export function shouldUseOfflineNotePath(images: File[]): boolean {
  return !navigator.onLine || images.length === 0;
}

export type QueuedNoteToastOptions = {
  /** Equipment-style combined message when images were dropped offline. */
  combinedOfflineMessage?: boolean;
  /** Work-order-style separate photo warning after offline save. */
  photoWarningMessage?: string;
};

/** Toast feedback after a queued offline note create succeeds. */
export function showQueuedNoteCreateToasts(
  hadImages: boolean,
  options: QueuedNoteToastOptions = {},
): void {
  if (options.combinedOfflineMessage) {
    toast.success(
      hadImages
        ? 'Note saved offline. Attach images when you reconnect.'
        : 'Note saved offline — will sync when you reconnect.',
    );
    return;
  }

  toast.success('Note saved offline — will sync when you reconnect.');
  if (hadImages && options.photoWarningMessage) {
    toast.warning(options.photoWarningMessage);
  }
}

export function handleNoteCreateMutationSuccess(
  result: unknown,
  options: {
    onQueuedOffline: (hadImages: boolean) => void;
    onOnlineSuccess: () => void;
    resetForm: () => void;
  },
): void {
  const queued =
    typeof result === 'object' &&
    result !== null &&
    'queuedOffline' in result &&
    (result as QueuedNoteCreateResult).queuedOffline;

  if (queued) {
    const hadImages =
      typeof result === 'object' &&
      result !== null &&
      'hadImages' in result &&
      Boolean((result as QueuedNoteCreateResult & { hadImages?: boolean }).hadImages);
    options.onQueuedOffline(hadImages);
  } else {
    options.onOnlineSuccess();
  }

  options.resetForm();
}

export function createNoteCreateMutationCallbacks(options: {
  onQueuedOffline: (hadImages: boolean) => void;
  onOnlineSuccess: () => void;
  resetForm: () => void;
}) {
  return {
    onSuccess: (result: unknown) => handleNoteCreateMutationSuccess(result, options),
    onError: (error: unknown) => {
      logger.error('Failed to create note', error);
      toast.error('Failed to create note');
    },
  };
}
