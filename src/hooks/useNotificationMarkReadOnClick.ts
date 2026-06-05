import { useCallback } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { logger } from '@/utils/logger';

type ReadableNotification = {
  id: string;
  read: boolean;
};

export function useNotificationMarkReadOnClick(
  markAsReadMutation: Pick<UseMutationResult<unknown, Error, string, unknown>, 'mutateAsync'>,
) {
  return useCallback(
    async (notification: ReadableNotification) => {
      if (!notification.read) {
        try {
          await markAsReadMutation.mutateAsync(notification.id);
        } catch (error) {
          logger.error('Error marking notification as read', error);
        }
      }
    },
    [markAsReadMutation],
  );
}
