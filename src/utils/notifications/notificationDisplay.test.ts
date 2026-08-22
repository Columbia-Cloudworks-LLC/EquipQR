import { describe, expect, it } from 'vitest';
import {
  navigateForNotification,
  notificationHasNavigableAction,
  resolveNotificationDestination,
} from '@/utils/notifications/notificationDisplay';

describe('notificationDisplay destination re-exports', () => {
  it('keeps destination helpers available from the display module', () => {
    expect(typeof resolveNotificationDestination).toBe('function');
    expect(typeof notificationHasNavigableAction).toBe('function');
    expect(typeof navigateForNotification).toBe('function');
  });
});
