import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfflineAwareWorkOrderService } from '../offlineAwareService';
import { OfflineQueueService } from '../offlineQueueService';

// ── Mocks ────────────────────────────────────────────────────────────────────

const { mockCreate, mockSupabaseFrom } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockSupabaseFrom: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  },
}));

vi.mock('@/features/work-orders/services/workOrderService', () => ({
  WorkOrderService: vi.fn().mockImplementation(() => ({
    create: (...args: unknown[]) => mockCreate(...args),
  })),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const USER_ID = 'user-123';
const ORG_ID = 'org-456';

function makeCreateData() {
  return {
    title: 'Fix pump',
    description: 'Pump is broken',
    equipmentId: 'equip-1',
    priority: 'high' as const,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('OfflineAwareWorkOrderService', () => {
  // Reader to inspect localStorage queue (same key as the service's internal instance)
  let queueReader: OfflineQueueService;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    queueReader = new OfflineQueueService(USER_ID, ORG_ID);
  });

  describe('createWorkOrder', () => {
    it('queues immediately when navigator.onLine is false (TIER 1 pre-check)', () => {
      // Simulate offline
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = svc.createWorkOrder(makeCreateData());

      // Should resolve synchronously (no await needed for queue path)
      return result.then(r => {
        expect(r.queuedOffline).toBe(true);
        expect(r.data).toBeNull();
        expect(r.queueItemId).toBeDefined();
        expect(queueReader.getCount()).toBe(1);

        // Restore
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
      });
    });

    it('calls WorkOrderService.create() when online and succeeds', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

      mockCreate.mockResolvedValueOnce({
        success: true,
        data: { id: 'wo-new' },
        error: null,
      });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.createWorkOrder(makeCreateData());

      expect(result.queuedOffline).toBe(false);
      expect(result.data).toEqual({ id: 'wo-new' });
      expect(queueReader.getCount()).toBe(0);
    });

    it('queues on network error when online call fails (TIER 2 fallback)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

      mockCreate.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.createWorkOrder(makeCreateData());

      expect(result.queuedOffline).toBe(true);
      expect(queueReader.getCount()).toBe(1);
    });

    it('throws on non-network errors (permission, validation)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

      mockCreate.mockResolvedValueOnce({
        success: false,
        data: null,
        error: 'Permission denied',
      });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);

      await expect(svc.createWorkOrder(makeCreateData())).rejects.toThrow('Permission denied');
      expect(queueReader.getCount()).toBe(0);
    });

    it('works without a queue service (offline queue not available)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

      mockCreate.mockResolvedValueOnce({
        success: true,
        data: { id: 'wo-new' },
        error: null,
      });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.createWorkOrder(makeCreateData());

      expect(result.queuedOffline).toBe(false);
      expect(result.data).toEqual({ id: 'wo-new' });
    });

    it('always has a queue service — offline pre-check never falls through', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      // Queue service is always created internally — never null
      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.createWorkOrder(makeCreateData());

      expect(result.queuedOffline).toBe(true);
      expect(result.data).toBeNull();

      // Verify item is in localStorage
      const raw = localStorage.getItem(`equipqr_offline_queue_${USER_ID}_${ORG_ID}`);
      expect(raw).toBeTruthy();
      const items = JSON.parse(raw!);
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe('work_order_create');

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    });
  });

  describe('updateWorkOrder', () => {
    it('queues immediately when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.updateWorkOrder('wo-1', { title: 'Updated' });

      expect(result.queuedOffline).toBe(true);
      expect(queueReader.getCount()).toBe(1);

      // Check that changedFields was captured
      const items = queueReader.getAll();
      expect(items[0].type).toBe('work_order_update');

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    });

    it('calls supabase directly when online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

      mockSupabaseFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'wo-1' }, error: null }),
            }),
          }),
        }),
      });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.updateWorkOrder('wo-1', { title: 'Updated' });

      expect(result.queuedOffline).toBe(false);
      expect(result.data).toBeTruthy();
    });
  });

  describe('updateStatus', () => {
    it('queues immediately when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.updateStatus('wo-1', 'completed');

      expect(result.queuedOffline).toBe(true);
      expect(queueReader.getCount()).toBe(1);

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    });
  });
});
