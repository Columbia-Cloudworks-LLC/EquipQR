import { describe, it, expect } from 'vitest';
import {
  offlineEquipPlaceholder,
  offlinePmPlaceholder,
  offlineWorkOrderPlaceholder,
  rewriteQueueItemsPlaceholders,
} from './offlineQueuePlaceholders';
import type { OfflineQueueItem } from './offlineQueueService';

describe('offlineQueuePlaceholders', () => {
  it('rewrites equipment and work order placeholders in dependent payloads', () => {
    const equipQueueId = 'equip-queue-1';
    const woQueueId = 'wo-queue-1';
    const items: OfflineQueueItem[] = [
      {
        id: woQueueId,
        type: 'work_order_create',
        payload: {
          title: 'Offline WO',
          description: 'Test',
          equipmentId: offlineEquipPlaceholder(equipQueueId),
          priority: 'medium',
        },
        organizationId: 'org-1',
        userId: 'user-1',
        timestamp: 1,
        retryCount: 0,
        maxRetries: 5,
        status: 'pending',
        payloadSizeBytes: 10,
      },
      {
        id: 'note-1',
        type: 'work_order_note',
        payload: {
          workOrderId: offlineWorkOrderPlaceholder(woQueueId),
          content: 'Note',
        },
        organizationId: 'org-1',
        userId: 'user-1',
        timestamp: 2,
        retryCount: 0,
        maxRetries: 5,
        status: 'pending',
        payloadSizeBytes: 10,
      },
    ];

    const rewritten = rewriteQueueItemsPlaceholders(items, {
      equipment: { [offlineEquipPlaceholder(equipQueueId)]: 'server-equip-uuid' },
      workOrders: { [offlineWorkOrderPlaceholder(woQueueId)]: 'server-wo-uuid' },
    });

    expect(rewritten[0].payload).toMatchObject({
      equipmentId: 'server-equip-uuid',
    });
    expect(rewritten[1].payload).toMatchObject({
      workOrderId: 'server-wo-uuid',
    });
  });

  it('rewrites offline PM placeholders', () => {
    const parentId = 'wo-parent';
    const items: OfflineQueueItem[] = [
      {
        id: 'pm-update-1',
        type: 'pm_update',
        payload: {
          pmId: offlinePmPlaceholder(parentId),
          notes: 'Updated offline',
        },
        organizationId: 'org-1',
        userId: 'user-1',
        timestamp: 1,
        retryCount: 0,
        maxRetries: 5,
        status: 'pending',
        payloadSizeBytes: 10,
      },
    ];

    const rewritten = rewriteQueueItemsPlaceholders(items, {
      pm: { [offlinePmPlaceholder(parentId)]: 'server-pm-uuid' },
    });

    expect(rewritten[0].payload).toMatchObject({ pmId: 'server-pm-uuid' });
  });
});
