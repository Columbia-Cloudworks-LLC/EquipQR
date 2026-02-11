import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OfflineQueueService, OfflineQueuePayloadError } from '../offlineQueueService';
import type { OfflineQueueEnqueueInput } from '../offlineQueueService';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const USER_ID = 'user-123';
const ORG_ID = 'org-456';
const STORAGE_KEY = `equipqr_offline_queue_${USER_ID}_${ORG_ID}`;

function createService() {
  return new OfflineQueueService(USER_ID, ORG_ID);
}

function makeCreateInput(overrides?: Partial<OfflineQueueEnqueueInput>): OfflineQueueEnqueueInput {
  return {
    type: 'work_order_create',
    payload: {
      title: 'Fix pump',
      description: 'The pump is broken',
      equipmentId: 'equip-1',
      priority: 'high' as const,
    },
    organizationId: ORG_ID,
    userId: USER_ID,
    ...overrides,
  };
}

describe('OfflineQueueService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ── Basic CRUD ──────────────────────────────────────────────────────────

  it('starts with an empty queue', () => {
    const svc = createService();
    expect(svc.getAll()).toEqual([]);
    expect(svc.getCount()).toBe(0);
    expect(svc.getPendingCount()).toBe(0);
    expect(svc.getFailedCount()).toBe(0);
  });

  it('enqueues an item and persists to localStorage', () => {
    const svc = createService();
    const item = svc.enqueue(makeCreateInput());

    expect(item).toBeDefined();
    expect(item.id).toBeDefined();
    expect(item.type).toBe('work_order_create');
    expect(item.status).toBe('pending');
    expect(item.retryCount).toBe(0);
    expect(item.maxRetries).toBe(5);
    expect(item.payloadSizeBytes).toBeGreaterThan(0);

    // Check localStorage
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(item.id);
  });

  it('getAll returns all items', () => {
    const svc = createService();
    svc.enqueue(makeCreateInput());
    svc.enqueue(makeCreateInput());

    expect(svc.getAll()).toHaveLength(2);
    expect(svc.getCount()).toBe(2);
  });

  it('peek returns the first pending item', () => {
    const svc = createService();
    const first = svc.enqueue(makeCreateInput());
    svc.enqueue(makeCreateInput());

    const peeked = svc.peek();
    expect(peeked?.id).toBe(first.id);
  });

  it('removes an item by id', () => {
    const svc = createService();
    const item = svc.enqueue(makeCreateInput());
    svc.enqueue(makeCreateInput());

    svc.remove(item.id);
    expect(svc.getCount()).toBe(1);
    expect(svc.getAll().find(i => i.id === item.id)).toBeUndefined();
  });

  it('clears all items', () => {
    const svc = createService();
    svc.enqueue(makeCreateInput());
    svc.enqueue(makeCreateInput());

    svc.clear();
    expect(svc.getCount()).toBe(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  // ── Status management ───────────────────────────────────────────────────

  it('updateStatus changes item status', () => {
    const svc = createService();
    const item = svc.enqueue(makeCreateInput());

    svc.updateStatus(item.id, 'processing');
    expect(svc.getAll()[0].status).toBe('processing');

    svc.updateStatus(item.id, 'failed', 'Network timeout');
    const updated = svc.getAll()[0];
    expect(updated.status).toBe('failed');
    expect(updated.lastError).toBe('Network timeout');
  });

  it('updateRetry increments retryCount and resets status to pending', () => {
    const svc = createService();
    const item = svc.enqueue(makeCreateInput());

    svc.updateStatus(item.id, 'processing');
    svc.updateRetry(item.id, 1, 'Retry error');

    const updated = svc.getAll()[0];
    expect(updated.retryCount).toBe(1);
    expect(updated.status).toBe('pending');
    expect(updated.lastError).toBe('Retry error');
  });

  it('retryFailedItems resets all failed items to pending', () => {
    const svc = createService();
    const item1 = svc.enqueue(makeCreateInput());
    const item2 = svc.enqueue(makeCreateInput());

    svc.updateStatus(item1.id, 'failed', 'Error 1');
    svc.updateStatus(item2.id, 'failed', 'Error 2');

    expect(svc.getFailedCount()).toBe(2);
    expect(svc.getPendingCount()).toBe(0);

    svc.retryFailedItems();

    expect(svc.getFailedCount()).toBe(0);
    expect(svc.getPendingCount()).toBe(2);
    expect(svc.getAll()[0].retryCount).toBe(0);
  });

  it('getFailedItems returns only failed items', () => {
    const svc = createService();
    const item1 = svc.enqueue(makeCreateInput());
    svc.enqueue(makeCreateInput());

    svc.updateStatus(item1.id, 'failed', 'Error');

    const failed = svc.getFailedItems();
    expect(failed).toHaveLength(1);
    expect(failed[0].id).toBe(item1.id);
  });

  // ── Size guards ─────────────────────────────────────────────────────────

  it('rejects payloads exceeding 50KB', () => {
    const svc = createService();
    const largeDescription = 'x'.repeat(60 * 1024); // 60 KB

    expect(() => {
      svc.enqueue(
        makeCreateInput({
          payload: {
            title: 'Large',
            description: largeDescription,
            equipmentId: 'equip-1',
            priority: 'high',
          },
        }),
      );
    }).toThrow(OfflineQueuePayloadError);
  });

  it('evicts the oldest pending item when at 50-item cap', () => {
    const svc = createService();

    // Fill to capacity
    for (let i = 0; i < 50; i++) {
      svc.enqueue(makeCreateInput());
    }
    expect(svc.getCount()).toBe(50);

    // Enqueue one more — should evict the oldest
    const newItem = svc.enqueue(makeCreateInput());
    expect(svc.getCount()).toBe(50);
    // The new item should be the last one
    const all = svc.getAll();
    expect(all[all.length - 1].id).toBe(newItem.id);
  });

  // ── Binary data detection ───────────────────────────────────────────────

  it('detects data URIs as binary', () => {
    expect(OfflineQueueService.containsBinaryData('data:image/png;base64,iVBOR')).toBe(true);
    expect(OfflineQueueService.containsBinaryData('data:application/octet-stream;base64,abc')).toBe(true);
  });

  it('detects large base64 blocks as binary', () => {
    const bigBlock = 'A'.repeat(12000);
    expect(OfflineQueueService.containsBinaryData(bigBlock)).toBe(true);
  });

  it('does not flag normal JSON as binary', () => {
    expect(OfflineQueueService.containsBinaryData('{"title":"Fix pump","description":"Broken"}')).toBe(false);
  });

  // ── Scoping ─────────────────────────────────────────────────────────────

  it('scopes data per user + org', () => {
    const svc1 = new OfflineQueueService('user-a', 'org-1');
    const svc2 = new OfflineQueueService('user-b', 'org-1');

    svc1.enqueue(makeCreateInput({ userId: 'user-a', organizationId: 'org-1' }));

    expect(svc1.getCount()).toBe(1);
    expect(svc2.getCount()).toBe(0);
  });

  // ── Resilience ──────────────────────────────────────────────────────────

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    const svc = createService();
    expect(svc.getAll()).toEqual([]);
  });

  // ── Queue compaction ────────────────────────────────────────────────────

  describe('compact()', () => {
    it('merges multiple updates to the same workOrderId', () => {
      const svc = createService();
      svc.enqueue({
        type: 'work_order_update',
        payload: { workOrderId: 'wo-1', data: { title: 'First' }, changedFields: ['title'] },
        organizationId: ORG_ID,
        userId: USER_ID,
      });
      svc.enqueue({
        type: 'work_order_update',
        payload: { workOrderId: 'wo-1', data: { description: 'Updated desc' }, changedFields: ['description'] },
        organizationId: ORG_ID,
        userId: USER_ID,
      });

      expect(svc.getCount()).toBe(2);
      svc.compact();
      expect(svc.getCount()).toBe(1);

      const item = svc.getAll()[0];
      expect(item.type).toBe('work_order_update');
      if (item.type === 'work_order_update') {
        expect(item.payload.data.title).toBe('First');
        expect(item.payload.data.description).toBe('Updated desc');
        expect(item.payload.changedFields).toContain('title');
        expect(item.payload.changedFields).toContain('description');
      }
    });

    it('keeps only the latest status per workOrderId', () => {
      const svc = createService();
      svc.enqueue({
        type: 'work_order_status',
        payload: { workOrderId: 'wo-1', newStatus: 'in_progress' as const },
        organizationId: ORG_ID,
        userId: USER_ID,
      });
      svc.enqueue({
        type: 'work_order_status',
        payload: { workOrderId: 'wo-1', newStatus: 'completed' as const },
        organizationId: ORG_ID,
        userId: USER_ID,
      });

      expect(svc.getCount()).toBe(2);
      svc.compact();
      expect(svc.getCount()).toBe(1);

      const item = svc.getAll()[0];
      expect(item.type).toBe('work_order_status');
      if (item.type === 'work_order_status') {
        expect(item.payload.newStatus).toBe('completed');
      }
    });

    it('preserves creates and sorts by timestamp', () => {
      const svc = createService();
      svc.enqueue(makeCreateInput());
      svc.enqueue({
        type: 'work_order_update',
        payload: { workOrderId: 'wo-1', data: { title: 'Updated' } },
        organizationId: ORG_ID,
        userId: USER_ID,
      });

      svc.compact();
      expect(svc.getCount()).toBe(2);
      expect(svc.getAll()[0].type).toBe('work_order_create');
      expect(svc.getAll()[1].type).toBe('work_order_update');
    });

    it('does nothing on a queue with 0-1 items', () => {
      const svc = createService();
      svc.compact(); // empty queue
      expect(svc.getCount()).toBe(0);

      svc.enqueue(makeCreateInput());
      svc.compact(); // single item
      expect(svc.getCount()).toBe(1);
    });

    it('merges multiple equipment updates to the same equipmentId', () => {
      const svc = createService();
      svc.enqueue({
        type: 'equipment_update',
        payload: { equipmentId: 'eq-1', data: { name: 'First' }, changedFields: ['name'] },
        organizationId: ORG_ID,
        userId: USER_ID,
      });
      svc.enqueue({
        type: 'equipment_update',
        payload: { equipmentId: 'eq-1', data: { location: 'Warehouse' }, changedFields: ['location'] },
        organizationId: ORG_ID,
        userId: USER_ID,
      });

      expect(svc.getCount()).toBe(2);
      svc.compact();
      expect(svc.getCount()).toBe(1);

      const item = svc.getAll()[0];
      expect(item.type).toBe('equipment_update');
      if (item.type === 'equipment_update') {
        expect(item.payload.data.name).toBe('First');
        expect(item.payload.data.location).toBe('Warehouse');
      }
    });

    it('keeps only the latest equipment hours per equipmentId', () => {
      const svc = createService();
      svc.enqueue({
        type: 'equipment_hours',
        payload: { equipmentId: 'eq-1', newHours: 100 },
        organizationId: ORG_ID,
        userId: USER_ID,
      });
      svc.enqueue({
        type: 'equipment_hours',
        payload: { equipmentId: 'eq-1', newHours: 150 },
        organizationId: ORG_ID,
        userId: USER_ID,
      });

      expect(svc.getCount()).toBe(2);
      svc.compact();
      expect(svc.getCount()).toBe(1);

      const item = svc.getAll()[0];
      expect(item.type).toBe('equipment_hours');
      if (item.type === 'equipment_hours') {
        expect(item.payload.newHours).toBe(150);
      }
    });
  });
});
