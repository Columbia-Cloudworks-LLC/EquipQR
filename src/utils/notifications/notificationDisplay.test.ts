import { describe, expect, it } from 'vitest';
import {
  getNotificationEmoji,
  getNotificationTypeLabel,
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

describe('notificationDisplay labels', () => {
  it('labels export_ready instead of falling back to General', () => {
    expect(getNotificationTypeLabel('export_ready')).toBe('Export Ready');
    expect(getNotificationEmoji('export_ready')).toBe('📊');
  });
});
