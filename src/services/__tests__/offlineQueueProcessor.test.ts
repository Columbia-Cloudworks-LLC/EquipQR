import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfflineQueueProcessor } from '../offlineQueueProcessor';
import { OfflineQueueService } from '../offlineQueueService';
import type { OfflineQueueItem } from '../offlineQueueService';
import { QueryClient } from '@tanstack/react-query';

// ── Mock setup ─────────────────────────────────────────────────────────
const { mockCreate, mockSupabaseAuth, mockSupabaseFrom, mockGetSession, mockRefreshSession } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockSupabaseAuth: vi.fn(),
  mockSupabaseFrom: vi.fn(),
  mockGetSession: vi.fn(),
  mockRefreshSession: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    auth: {
      getUser: () => mockSupabaseAuth(),
      getSession: () => mockGetSession(),
      refreshSession: () => mockRefreshSession(),
    },
  },
}));

vi.mock('@/features/work-orders/services/workOrderService', () => ({
  WorkOrderService: vi.fn().mockImplementation(() => ({
    create: (...args: unknown[]) => mockCreate(...args),
  })),
}));

// ── Equipment & notes mocks ──────────────────────────────────────────────
const {
  mockEquipmentCreateQuick,
  mockEquipmentCreate,
  mockEquipmentUpdate,
  mockUpdateWorkingHours,
  mockCreateEquipmentNote,
  mockCreateWorkOrderNote,
} = vi.hoisted(() => ({
  mockEquipmentCreateQuick: vi.fn(),
  mockEquipmentCreate: vi.fn(),
  mockEquipmentUpdate: vi.fn(),
  mockUpdateWorkingHours: vi.fn(),
  mockCreateEquipmentNote: vi.fn(),
  mockCreateWorkOrderNote: vi.fn(),
}));

vi.mock('@/features/equipment/services/EquipmentService', () => ({
  EquipmentService: {
    createQuick: (...args: unknown[]) => mockEquipmentCreateQuick(...args),
    create: (...args: unknown[]) => mockEquipmentCreate(...args),
    update: (...args: unknown[]) => mockEquipmentUpdate(...args),
  },
}));

vi.mock('@/features/equipment/services/equipmentWorkingHoursService', () => ({
  updateEquipmentWorkingHours: (...args: unknown[]) => mockUpdateWorkingHours(...args),
}));

vi.mock('@/features/equipment/services/equipmentNotesService', () => ({
  createEquipmentNoteWithImages: (...args: unknown[]) => mockCreateEquipmentNote(...args),
}));

vi.mock('@/features/work-orders/services/workOrderNotesService', () => ({
  createWorkOrderNoteWithImages: (...args: unknown[]) => mockCreateWorkOrderNote(...args),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const USER_ID = 'user-123';
const ORG_ID = 'org-456';
const STORAGE_KEY = `equipqr_offline_queue_${USER_ID}_${ORG_ID}`;

function createPendingItem(overrides?: Partial<OfflineQueueItem>): OfflineQueueItem {
  return {
    id: crypto.randomUUID(),
    type: 'work_order_create',
    payload: {
      title: 'Fix pump',
      description: 'The pump is broken',
      equipmentId: 'equip-1',
      priority: 'high' as const,
    },
    organizationId: ORG_ID,
    userId: USER_ID,
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 5,
    status: 'pending' as const,
    payloadSizeBytes: 100,
    ...overrides,
  } as OfflineQueueItem;
}

describe('OfflineQueueProcessor', () => {
  let queueService: OfflineQueueService;
  let queryClient: QueryClient;
  let processor: OfflineQueueProcessor;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    queueService = new OfflineQueueService(USER_ID, ORG_ID);
    queryClient = new QueryClient();
    processor = new OfflineQueueProcessor(queueService, queryClient);

    // Defaults: valid session + valid user
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    mockSupabaseAuth.mockResolvedValue({ data: { user: { id: USER_ID } } });
  });

  // ── Basic processing ───────────────────────────────────────────────────

  it('returns zero counts for an empty queue', async () => {
    const result = await processor.processAll();
    expect(result).toEqual({ succeeded: 0, failed: 0, remaining: 0, conflicts: [] });
  });

  it('processes a work_order_create item successfully', async () => {
    queueService.enqueue({
      type: 'work_order_create',
      payload: { title: 'Fix pump', description: 'Broken', equipmentId: 'equip-1', priority: 'high' },
      organizationId: ORG_ID,
      userId: USER_ID,
    });

    mockCreate.mockResolvedValueOnce({ success: true, data: { id: 'new-wo-1' }, error: null });

    const result = await processor.processAll();

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(queueService.getCount()).toBe(0);
  });

  it('handles a failed create and increments retryCount', async () => {
    queueService.enqueue({
      type: 'work_order_create',
      payload: { title: 'Fix pump', description: 'Broken', equipmentId: 'equip-1', priority: 'high' },
      organizationId: ORG_ID,
      userId: USER_ID,
    });

    mockCreate.mockResolvedValueOnce({ success: false, data: null, error: 'Server error' });

    const result = await processor.processAll();

    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0); // Not exhausted yet

    const remaining = queueService.getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].retryCount).toBe(1);
    expect(remaining[0].status).toBe('pending');
  });

  it('marks item as failed after exhausting retries', async () => {
    const item = createPendingItem({ retryCount: 4, maxRetries: 5 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));

    mockCreate.mockResolvedValueOnce({ success: false, data: null, error: 'Persistent error' });

    const result = await processor.processAll();

    expect(result.failed).toBe(1);
    const all = queueService.getAll();
    expect(all[0].status).toBe('failed');
    expect(all[0].lastError).toBeTruthy();
  });

  it('processes work_order_update items via supabase', async () => {
    const item = createPendingItem({
      type: 'work_order_update',
      payload: { workOrderId: 'wo-123', data: { title: 'Updated title' } },
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));

    mockSupabaseFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        }),
      }),
    });

    const result = await processor.processAll();
    expect(result.succeeded).toBe(1);
  });

  it('processes work_order_status items via supabase', async () => {
    const item = createPendingItem({
      type: 'work_order_status',
      payload: { workOrderId: 'wo-123', newStatus: 'completed' },
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));

    mockSupabaseFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        }),
      }),
    });

    const result = await processor.processAll();
    expect(result.succeeded).toBe(1);
  });

  it('invalidates query caches after successful sync', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    queueService.enqueue({
      type: 'work_order_create',
      payload: { title: 'Fix pump', description: 'Broken', equipmentId: 'equip-1', priority: 'high' },
      organizationId: ORG_ID,
      userId: USER_ID,
    });

    mockCreate.mockResolvedValueOnce({ success: true, data: { id: 'new-wo-1' }, error: null });

    await processor.processAll();

    expect(invalidateSpy).toHaveBeenCalled();
    const calls = invalidateSpy.mock.calls.map(c => c[0]);
    const queryKeys = calls.map(c => (c as { queryKey: unknown[] }).queryKey);
    expect(queryKeys.some(k => Array.isArray(k) && k.includes(ORG_ID))).toBe(true);
  });

  it('processes items sequentially in FIFO order', async () => {
    const executionOrder: string[] = [];

    const item1 = createPendingItem({
      payload: { title: 'First', description: 'First item', equipmentId: 'equip-1', priority: 'low' },
    });
    const item2 = createPendingItem({
      payload: { title: 'Second', description: 'Second item', equipmentId: 'equip-2', priority: 'high' },
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item1, item2]));

    mockCreate
      .mockImplementationOnce(async (data: Record<string, unknown>) => {
        executionOrder.push(data.title as string);
        return { success: true, data: { id: 'wo-1' }, error: null };
      })
      .mockImplementationOnce(async (data: Record<string, unknown>) => {
        executionOrder.push(data.title as string);
        return { success: true, data: { id: 'wo-2' }, error: null };
      });

    await processor.processAll();

    expect(executionOrder).toEqual(['First', 'Second']);
  });

  // ── Session refresh ────────────────────────────────────────────────────

  it('refreshes session when getSession returns null', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    mockRefreshSession.mockResolvedValueOnce({ error: null });

    queueService.enqueue({
      type: 'work_order_create',
      payload: { title: 'Fix pump', description: 'Broken', equipmentId: 'equip-1', priority: 'high' },
      organizationId: ORG_ID,
      userId: USER_ID,
    });
    mockCreate.mockResolvedValueOnce({ success: true, data: { id: 'wo-1' }, error: null });

    const result = await processor.processAll();
    expect(mockRefreshSession).toHaveBeenCalled();
    expect(result.succeeded).toBe(1);
  });

  it('returns early when session refresh fails', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    mockRefreshSession.mockResolvedValueOnce({ error: new Error('Refresh failed') });

    queueService.enqueue({
      type: 'work_order_create',
      payload: { title: 'Fix pump', description: 'Broken', equipmentId: 'equip-1', priority: 'high' },
      organizationId: ORG_ID,
      userId: USER_ID,
    });

    const result = await processor.processAll();
    expect(result.succeeded).toBe(0);
    expect(result.remaining).toBeGreaterThan(0);
    // Item should still be in the queue
    expect(queueService.getCount()).toBe(1);
  });

  // ── Conflict detection (status) ────────────────────────────────────────

  it('skips status change when server WO is already completed (server-wins)', async () => {
    const item = createPendingItem({
      type: 'work_order_status',
      payload: {
        workOrderId: 'wo-123',
        newStatus: 'in_progress',
        serverUpdatedAt: '2026-01-01T00:00:00Z',
      },
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));

    // First call: getSession (already mocked)
    // Supabase from() for the status handler's conflict check
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { status: 'completed', updated_at: '2026-02-01T00:00:00Z' },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        }),
      }),
    });

    const result = await processor.processAll();
    expect(result.succeeded).toBe(1);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].type).toBe('status_conflict');
    expect(result.conflicts[0].details).toContain('completed');
  });

  // ── Equipment handler tests ──────────────────────────────────────────────

  it('processes equipment_create via EquipmentService.createQuick()', async () => {
    const payload = { name: 'Loader', manufacturer: 'Cat', model: 'D6', serial_number: 'SN-001', team_id: 'team-1' };
    const item = createPendingItem({
      type: 'equipment_create',
      payload,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));

    mockEquipmentCreateQuick.mockResolvedValueOnce({ success: true, data: { id: 'eq-new' } });

    const result = await processor.processAll();

    expect(result.succeeded).toBe(1);
    expect(mockEquipmentCreateQuick).toHaveBeenCalledWith(ORG_ID, payload);
    expect(queueService.getCount()).toBe(0);
  });

  it('processes equipment_create_full via EquipmentService.create()', async () => {
    const payload = {
      name: 'Excavator', manufacturer: 'Komatsu', model: 'PC200',
      serial_number: 'SN-002', team_id: 'team-1', status: 'active',
      location: 'Yard A',
    };
    const item = createPendingItem({
      type: 'equipment_create_full',
      payload,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));

    mockEquipmentCreate.mockResolvedValueOnce({ success: true, data: { id: 'eq-full' } });

    const result = await processor.processAll();

    expect(result.succeeded).toBe(1);
    expect(mockEquipmentCreate).toHaveBeenCalledWith(ORG_ID, payload);
  });

  it('processes equipment_update via EquipmentService.update()', async () => {
    const item = createPendingItem({
      type: 'equipment_update',
      payload: { equipmentId: 'eq-1', data: { name: 'Updated Loader' } },
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));

    mockEquipmentUpdate.mockResolvedValueOnce({ success: true, data: { id: 'eq-1' } });

    const result = await processor.processAll();

    expect(result.succeeded).toBe(1);
    expect(mockEquipmentUpdate).toHaveBeenCalledWith(ORG_ID, 'eq-1', { name: 'Updated Loader' });
  });

  it('processes equipment_hours via updateEquipmentWorkingHours()', async () => {
    const payload = { equipmentId: 'eq-1', newHours: 500, organizationId: ORG_ID };
    const item = createPendingItem({
      type: 'equipment_hours',
      payload,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));

    mockUpdateWorkingHours.mockResolvedValueOnce(undefined);

    const result = await processor.processAll();

    expect(result.succeeded).toBe(1);
    expect(mockUpdateWorkingHours).toHaveBeenCalledWith(payload);
  });

  it('processes equipment_note with empty images array', async () => {
    const item = createPendingItem({
      type: 'equipment_note',
      payload: { equipmentId: 'eq-1', content: 'Oil changed', hoursWorked: 2, isPrivate: false },
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));

    mockCreateEquipmentNote.mockResolvedValueOnce({ id: 'note-1' });

    const result = await processor.processAll();

    expect(result.succeeded).toBe(1);
    expect(mockCreateEquipmentNote).toHaveBeenCalledWith('eq-1', 'Oil changed', 2, false, [], ORG_ID);
  });

  it('processes work_order_note with empty images array', async () => {
    const item = createPendingItem({
      type: 'work_order_note',
      payload: { workOrderId: 'wo-1', content: 'Parts ordered', hoursWorked: 1, isPrivate: true },
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));

    mockCreateWorkOrderNote.mockResolvedValueOnce({ id: 'note-2' });

    const result = await processor.processAll();

    expect(result.succeeded).toBe(1);
    expect(mockCreateWorkOrderNote).toHaveBeenCalledWith('wo-1', 'Parts ordered', 1, true, [], ORG_ID);
  });

  it('invalidates equipment query cache after equipment sync', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const item = createPendingItem({
      type: 'equipment_create',
      payload: { name: 'Loader', manufacturer: 'Cat', model: 'D6', serial_number: 'SN-001' },
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));

    mockEquipmentCreateQuick.mockResolvedValueOnce({ success: true, data: { id: 'eq-new' } });

    await processor.processAll();

    expect(invalidateSpy).toHaveBeenCalled();
    const calls = invalidateSpy.mock.calls.map(c => c[0]);
    const queryKeys = calls.map(c => (c as { queryKey: unknown[] }).queryKey);
    expect(queryKeys.some(k => Array.isArray(k) && k.includes('equipment'))).toBe(true);
  });

  it('fails note handlers when auth session is expired', async () => {
    // Override the default mock — no authenticated user
    mockSupabaseAuth.mockResolvedValue({ data: { user: null } });

    const item = createPendingItem({
      type: 'equipment_note',
      payload: { equipmentId: 'eq-1', content: 'Test note', hoursWorked: 0, isPrivate: false },
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));

    const result = await processor.processAll();

    // Item should be retried (not yet exhausted), not succeeded
    expect(result.succeeded).toBe(0);
    const all = queueService.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].retryCount).toBe(1);
    expect(all[0].lastError).toContain('Session expired');
  });
});
