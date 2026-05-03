import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfflineAwareWorkOrderService } from '../offlineAwareService';
import { OfflineQueueService } from '../offlineQueueService';

// ── Mocks ────────────────────────────────────────────────────────────────────

const { mockCreate, mockSupabaseFrom, mockCreatePM, mockUpdatePM, mockDeletePM } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockSupabaseFrom: vi.fn(),
  mockCreatePM: vi.fn(),
  mockUpdatePM: vi.fn(),
  mockDeletePM: vi.fn(),
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

vi.mock('@/features/pm-templates/services/preventativeMaintenanceService', () => ({
  createPM: (...args: unknown[]) => mockCreatePM(...args),
  updatePM: (...args: unknown[]) => mockUpdatePM(...args),
  deletePM: (...args: unknown[]) => mockDeletePM(...args),
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

  // ── PM init ────────────────────────────────────────────────────────────────

  describe('initPM', () => {
    const pmInput = {
      workOrderId: 'wo-abc',
      equipmentId: 'equip-abc',
      templateId: 'tmpl-1',
      checklistData: [{ id: 'item-1', label: 'Check fluid', completed: false }],
      notes: 'Initial notes',
    };

    it('queues immediately when navigator.onLine is false (TIER 1 pre-check)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.initPM(pmInput);

      expect(result.queuedOffline).toBe(true);
      expect(result.data).toBeNull();
      expect(result.queueItemId).toBeDefined();
      expect(queueReader.getCount()).toBe(1);
      const items = queueReader.getAll();
      expect(items[0].type).toBe('pm_init');
      expect(items[0].payload).toMatchObject({
        workOrderId: 'wo-abc',
        equipmentId: 'equip-abc',
        templateId: 'tmpl-1',
      });

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    });

    it('returns PM data directly when online and createPM succeeds', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
      const fakePM = { id: 'pm-1', work_order_id: 'wo-abc', status: 'in_progress' };
      mockCreatePM.mockResolvedValueOnce(fakePM);

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.initPM(pmInput);

      expect(result.queuedOffline).toBe(false);
      expect(result.data).toEqual(fakePM);
      expect(queueReader.getCount()).toBe(0);
    });

    it('queues on network error when online call fails (TIER 2 fallback)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
      mockCreatePM.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.initPM(pmInput);

      expect(result.queuedOffline).toBe(true);
      expect(result.data).toBeNull();
      expect(queueReader.getCount()).toBe(1);
      const items = queueReader.getAll();
      expect(items[0].type).toBe('pm_init');

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    });

    it('throws on non-network errors (does not queue)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
      mockCreatePM.mockRejectedValueOnce(new Error('Permission denied'));

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      await expect(svc.initPM(pmInput)).rejects.toThrow('Permission denied');
      expect(queueReader.getCount()).toBe(0);
    });

    it('throws when workOrderId is an offline placeholder', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      await expect(
        svc.initPM({ ...pmInput, workOrderId: 'offline-placeholder-123' }),
      ).rejects.toThrow();
      expect(queueReader.getCount()).toBe(0);

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    });

    it('throws when createPM returns null (unexpected null response)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
      mockCreatePM.mockResolvedValueOnce(null);

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      await expect(svc.initPM(pmInput)).rejects.toThrow('Failed to create PM');
      expect(queueReader.getCount()).toBe(0);
    });
  });

  // ── PM update ──────────────────────────────────────────────────────────────

  describe('updatePM', () => {
    const pmId = 'pm-xyz';
    const updateData = {
      checklistData: [{ id: 'item-1', label: 'Check fluid', completed: true }],
      notes: 'Updated notes',
      status: 'in_progress' as const,
    };
    const serverUpdatedAt = '2026-05-01T10:00:00Z';

    it('queues immediately when navigator.onLine is false (TIER 1 pre-check)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.updatePM(pmId, updateData, serverUpdatedAt);

      expect(result.queuedOffline).toBe(true);
      expect(result.data).toBeNull();
      expect(result.queueItemId).toBeDefined();
      expect(queueReader.getCount()).toBe(1);
      const items = queueReader.getAll();
      expect(items[0].type).toBe('pm_update');
      expect(items[0].payload).toMatchObject({
        pmId,
        serverUpdatedAt,
        notes: 'Updated notes',
      });

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    });

    it('returns updated PM data directly when online and updatePM succeeds', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
      const fakePM = { id: pmId, status: 'in_progress', notes: 'Updated notes' };
      mockUpdatePM.mockResolvedValueOnce(fakePM);

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.updatePM(pmId, updateData, serverUpdatedAt);

      expect(result.queuedOffline).toBe(false);
      expect(result.data).toEqual(fakePM);
      expect(queueReader.getCount()).toBe(0);
    });

    it('queues on network error when online call fails (TIER 2 fallback)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
      mockUpdatePM.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.updatePM(pmId, updateData, serverUpdatedAt);

      expect(result.queuedOffline).toBe(true);
      expect(result.data).toBeNull();
      expect(queueReader.getCount()).toBe(1);
      const items = queueReader.getAll();
      expect(items[0].type).toBe('pm_update');

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    });

    it('throws on non-network errors (does not queue)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
      mockUpdatePM.mockRejectedValueOnce(new Error('Forbidden'));

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      await expect(svc.updatePM(pmId, updateData)).rejects.toThrow('Forbidden');
      expect(queueReader.getCount()).toBe(0);
    });

    it('queues without serverUpdatedAt (optional field defaults to undefined)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.updatePM(pmId, updateData);

      expect(result.queuedOffline).toBe(true);
      const items = queueReader.getAll();
      expect(items[0].payload).toMatchObject({ pmId });
      expect(items[0].payload.serverUpdatedAt).toBeUndefined();

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    });

    it('throws when updatePM returns null (unexpected null response)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
      mockUpdatePM.mockResolvedValueOnce(null);

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      await expect(svc.updatePM(pmId, updateData)).rejects.toThrow('Failed to update PM');
      expect(queueReader.getCount()).toBe(0);
    });
  });

  // ── PM delete ──────────────────────────────────────────────────────────────

  describe('deletePM', () => {
    const pmId = 'pm-delete-1';

    it('queues immediately when navigator.onLine is false (TIER 1 pre-check)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.deletePM(pmId);

      expect(result.queuedOffline).toBe(true);
      expect(result.data).toBeNull();
      expect(result.queueItemId).toBeDefined();
      expect(queueReader.getCount()).toBe(1);
      const items = queueReader.getAll();
      expect(items[0].type).toBe('pm_delete');
      expect(items[0].payload).toMatchObject({ pmId });

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    });

    it('returns success when online deletePM succeeds', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
      mockDeletePM.mockResolvedValueOnce(true);

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.deletePM(pmId);

      expect(result.queuedOffline).toBe(false);
      expect(result.data).toBeNull();
      expect(queueReader.getCount()).toBe(0);
    });

    it('queues on network error when online deletePM fails (TIER 2 fallback)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
      mockDeletePM.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.deletePM(pmId);

      expect(result.queuedOffline).toBe(true);
      expect(result.data).toBeNull();
      expect(queueReader.getCount()).toBe(1);
      const items = queueReader.getAll();
      expect(items[0].type).toBe('pm_delete');
      expect(items[0].payload).toMatchObject({ pmId });
    });

    it('throws on non-network errors (does not queue)', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
      mockDeletePM.mockRejectedValueOnce(new Error('Forbidden'));

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      await expect(svc.deletePM(pmId)).rejects.toThrow('Forbidden');
      expect(queueReader.getCount()).toBe(0);
    });
  });
});
