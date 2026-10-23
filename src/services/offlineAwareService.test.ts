import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { OfflineAwareWorkOrderService } from './offlineAwareService';
import { OfflineQueueService, computeOfflineRetryDelayMs } from './offlineQueueService';
import {
  saveCachedReferenceData,
  getCachedReferenceData,
  clearCachedReferenceData,
  withOfflineReferenceFallback,
} from './offlineReferenceCache';

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
  WorkOrderService: vi.fn(function WorkOrderServiceMock() {
    return {
      create: (...args: unknown[]) => mockCreate(...args),
    };
  }),
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

vi.mock('./offlineQueueImageRefs', () => ({
  stageQueueImageRefs: vi.fn(async (_userId: string, _orgId: string, files: File[]) =>
    files.map((file, index) => ({
      blobKey: `blob-${index}`,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    })),
  ),
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

function jpegFile(name = 'snap.jpg') {
  return new File(['x'], name, { type: 'image/jpeg' });
}

function makeChecklistItem(overrides: Partial<PMChecklistItem> = {}): PMChecklistItem {
  return {
    id: 'item-1',
    title: 'Check fluid',
    condition: null,
    required: true,
    section: 'Fluids',
    ...overrides,
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

    it('queues offline work orders with staged creation photos', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.createWorkOrder({ ...makeCreateData(), images: [jpegFile()] });

      expect(result.queuedOffline).toBe(true);
      expect(queueReader.getCount()).toBe(1);
      const item = queueReader.getAll()[0];
      expect(item.type).toBe('work_order_create');
      expect((item.payload as { imageRefs?: unknown[] }).imageRefs).toHaveLength(1);

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    });

    it('forwards estimatedHours to WorkOrderService.create()', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

      mockCreate.mockResolvedValueOnce({
        success: true,
        data: { id: 'wo-new' },
        error: null,
      });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      await svc.createWorkOrder({ ...makeCreateData(), estimatedHours: 2.5 });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ estimated_hours: 2.5 }),
      );
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

    it('queues on network error when creation photos are attached', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

      mockCreate.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.createWorkOrder({ ...makeCreateData(), images: [jpegFile()] });

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
      checklistData: [makeChecklistItem()],
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

    it('queues pm_init when workOrderId is an offline placeholder', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.initPM({ ...pmInput, workOrderId: 'offline-placeholder-123' });

      expect(result.queuedOffline).toBe(true);
      expect(queueReader.getCount()).toBe(1);

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
      checklistData: [makeChecklistItem({ condition: 1 })],
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
      expect(items[0].type).toBe('pm_update');
      expect(items[0].payload).toMatchObject({ pmId });
      if (items[0].type === 'pm_update') {
        expect(items[0].payload.serverUpdatedAt).toBeUndefined();
      }

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

  // ── Offline Equipment Intake with Photos & Scan Logging (#1645) ──────────

  describe('offline intake queue with media and scan timestamps (#1645)', () => {
    it('stages camera photos when createEquipmentFull runs offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const result = await svc.createEquipmentFull(
        {
          name: 'Cat 320 Excavator',
          manufacturer: 'Caterpillar',
          model: '320',
          serial_number: 'CAT-320-001',
          status: 'active',
          location: 'Yard Bay 4',
          installation_date: '2026-10-23',
          warranty_expiration: null,
          last_maintenance: null,
          notes: 'Data plate captured offline',
          custom_attributes: null,
          image_url: null,
          last_known_location: null,
          team_id: null,
          default_pm_template_id: null,
          customer_id: null,
          working_hours: 120,
          import_id: null,
          assigned_location_street: null,
          assigned_location_city: null,
          assigned_location_state: null,
          assigned_location_country: null,
          assigned_location_lat: null,
          assigned_location_lng: null,
        },
        {
          images: [jpegFile('nameplate.jpg'), jpegFile('side-profile.jpg')],
          displayImageIndex: 1,
        },
      );

      expect(result.queuedOffline).toBe(true);
      const items = queueReader.getAll();
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe('equipment_create_full');
      if (items[0].type === 'equipment_create_full') {
        expect(items[0].payload.imageRefs).toHaveLength(2);
        expect(items[0].payload.displayImageIndex).toBe(1);
      }

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    });

    it('queues equipment_scan with original scan timestamp when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const svc = new OfflineAwareWorkOrderService(ORG_ID, USER_ID);
      const originalScannedAt = '2026-10-23T09:15:30.000Z';
      const result = await svc.logEquipmentScan({
        equipmentId: 'equip-99',
        scannedAt: originalScannedAt,
        location: '33.998,-81.045',
        notes: 'Yard intake check',
      });

      expect(result.queuedOffline).toBe(true);
      const items = queueReader.getAll();
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe('equipment_scan');
      if (items[0].type === 'equipment_scan') {
        expect(items[0].payload.scannedAt).toBe(originalScannedAt);
        expect(items[0].payload.location).toBe('33.998,-81.045');
      }

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    });

    it('computes exponential backoff and supports sync_conflict flagging', () => {
      expect(computeOfflineRetryDelayMs(1)).toBe(1000);
      expect(computeOfflineRetryDelayMs(2)).toBe(2000);
      expect(computeOfflineRetryDelayMs(3)).toBe(4000);
      expect(computeOfflineRetryDelayMs(10)).toBe(30000);

      const enqueued = queueReader.enqueue({
        type: 'equipment_scan',
        organizationId: ORG_ID,
        userId: USER_ID,
        payload: {
          equipmentId: 'equip-1',
          scannedAt: '2026-10-23T10:00:00.000Z',
          location: null,
          notes: null,
        },
      });

      queueReader.updateRetry(enqueued.id, 2, 'Network flap');
      const retried = queueReader.getById(enqueued.id);
      expect(retried?.retryCount).toBe(2);
      expect(typeof retried?.nextRetryAt).toBe('number');

      queueReader.markConflict(enqueued.id, 'QR tag already claimed by another user');
      const conflicted = queueReader.getById(enqueued.id);
      expect(conflicted?.status).toBe('failed');
      expect(conflicted?.conflictState).toBe('sync_conflict');
    });

    it('caches and falls back to reference data when offline', async () => {
      await saveCachedReferenceData(ORG_ID, 'customers', [{ id: 'cust-1', name: 'Acme Construction' }]);
      const cached = await getCachedReferenceData<Array<{ id: string; name: string }>>(ORG_ID, 'customers');
      expect(cached?.data).toEqual([{ id: 'cust-1', name: 'Acme Construction' }]);

      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });
      const offlineResult = await withOfflineReferenceFallback({
        organizationId: ORG_ID,
        kind: 'customers',
        fallbackValue: [],
        fetcher: async () => {
          throw new Error('Should not be called while offline');
        },
      });
      expect(offlineResult).toEqual([{ id: 'cust-1', name: 'Acme Construction' }]);

      await clearCachedReferenceData(ORG_ID, 'customers');
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });
    });
  });
});
