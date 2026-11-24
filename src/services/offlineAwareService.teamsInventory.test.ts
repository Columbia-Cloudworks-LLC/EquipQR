import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfflineAwareWorkOrderService } from './offlineAwareService';
import { OfflineQueueService } from './offlineQueueService';

const { mockCreateTeam, mockCreateItem, mockUpdateItem, mockAdjust, mockNewestMovement, mockEquipmentUpdate } = vi.hoisted(() => ({
  mockCreateTeam: vi.fn(),
  mockCreateItem: vi.fn(),
  mockUpdateItem: vi.fn(),
  mockAdjust: vi.fn(),
  mockNewestMovement: vi.fn(),
  mockEquipmentUpdate: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/features/teams/services/repositories/TeamRepository', () => ({
  default: { createTeamWithCreator: (...args: unknown[]) => mockCreateTeam(...args) },
}));
vi.mock('@/features/inventory/services/inventoryService', () => ({
  createInventoryItem: (...args: unknown[]) => mockCreateItem(...args),
  updateInventoryItem: (...args: unknown[]) => mockUpdateItem(...args),
  adjustInventoryQuantity: (...args: unknown[]) => mockAdjust(...args),
  getNewestInventoryMovementTime: (...args: unknown[]) => mockNewestMovement(...args),
}));
vi.mock('@/features/equipment/services/EquipmentService', () => ({
  EquipmentService: { update: (...args: unknown[]) => mockEquipmentUpdate(...args) },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() } }));
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const USER = 'user-1';
const ORG = 'org-1';
const team = { id: 'team-device-id', name: 'Night crew', organization_id: ORG };
const form = {
  name: 'Oil filter',
  quantity_on_hand: 4,
  low_stock_threshold: 2,
  compatibleEquipmentIds: [],
  compatibilityRules: [],
  alternateGroupMode: 'none' as const,
};

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true, writable: true });
}

describe('teams, inventory and equipment edits with no connection', () => {
  let queue: OfflineQueueService;
  let service: OfflineAwareWorkOrderService;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockNewestMovement.mockResolvedValue('2026-11-24T12:00:00.000Z');
    queue = new OfflineQueueService(USER, ORG);
    service = new OfflineAwareWorkOrderService(ORG, USER);
  });

  afterEach(() => setOnline(true));

  it('queues a team, an inventory item, an edit and a stock change instead of calling the server', async () => {
    setOnline(false);

    const results = [
      await service.createTeam(team, USER),
      await service.createInventoryItem('item-device-id', form),
      await service.updateInventoryItem('item-device-id', { name: 'Oil filter (long)' }),
      await service.adjustInventoryQuantity({ itemId: 'item-device-id', delta: -1, reason: 'Used' }),
    ];

    expect(results.every(result => result.queuedOffline && result.data === null)).toBe(true);
    expect(mockCreateTeam).not.toHaveBeenCalled();
    expect(mockCreateItem).not.toHaveBeenCalled();
    expect(mockAdjust).not.toHaveBeenCalled();
    expect(queue.getAll().map(item => [item.type, item.payload])).toEqual([
      ['team_create', { team, creatorId: USER }],
      ['inventory_create', { itemId: 'item-device-id', formData: form }],
      ['inventory_update', { itemId: 'item-device-id', formData: { name: 'Oil filter (long)' } }],
      ['inventory_adjust', { itemId: 'item-device-id', delta: -1, reason: 'Used' }],
    ]);
  });

  it('sends them straight to the server when connected, with the id chosen on the device', async () => {
    setOnline(true);
    mockCreateItem.mockResolvedValue({ id: 'item-device-id' });
    mockAdjust.mockResolvedValue(3);

    const created = await service.createInventoryItem('item-device-id', form);
    const adjusted = await service.adjustInventoryQuantity({ itemId: 'item-device-id', delta: -1, reason: 'Used' });

    expect(mockCreateItem).toHaveBeenCalledWith(ORG, form, USER, 'item-device-id');
    expect(created.queuedOffline).toBe(false);
    expect(adjusted).toEqual({ data: 3, queuedOffline: false });
    expect(queue.getCount()).toBe(0);
  });

  it('queues a stock change whose answer was lost, with what sync needs to avoid counting it twice', async () => {
    setOnline(true);
    // Supabase reports a failed request as a plain object, not an Error.
    mockAdjust.mockRejectedValueOnce({ message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' });

    const result = await service.adjustInventoryQuantity({ itemId: 'item-1', delta: 2, reason: 'Delivery' });

    expect(result.queuedOffline).toBe(true);
    expect(queue.getAll()[0]).toMatchObject({
      type: 'inventory_adjust',
      payload: { itemId: 'item-1', delta: 2, reason: 'Delivery', lastMovementBeforeReplay: '2026-11-24T12:00:00.000Z' },
    });
  });

  it('queues a stock change without sending it when the connection is already gone', async () => {
    setOnline(true);
    mockNewestMovement.mockRejectedValueOnce({ message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' });

    const result = await service.adjustInventoryQuantity({ itemId: 'item-1', delta: 2, reason: 'Delivery' });

    expect(result.queuedOffline).toBe(true);
    expect(mockAdjust).not.toHaveBeenCalled();
    expect(queue.getAll()[0].payload).toEqual({ itemId: 'item-1', delta: 2, reason: 'Delivery' });
  });

  it('queues new changes behind ones still waiting to sync, even when connected again', async () => {
    setOnline(false);
    await service.updateInventoryItem('item-1', { name: 'First name' });
    await service.createTeam(team, USER);

    // Signal is back, but the queue has not synced yet.
    setOnline(true);
    const edit = await service.updateInventoryItem('item-1', { name: 'Second name' });
    const count = await service.adjustInventoryQuantity({ itemId: 'item-1', delta: -1, reason: 'Manual adjustment' });
    // Existing equipment moved into the team that only exists in the queue.
    const move = await service.updateEquipment('equipment-1', { team_id: team.id });

    expect([edit, count, move].every(result => result.queuedOffline)).toBe(true);
    expect(mockUpdateItem).not.toHaveBeenCalled();
    expect(mockAdjust).not.toHaveBeenCalled();
    expect(mockEquipmentUpdate).not.toHaveBeenCalled();
    expect(queue.getAll().map(item => item.type)).toEqual([
      'inventory_update',
      'team_create',
      'inventory_update',
      'inventory_adjust',
      'equipment_update',
    ]);
  });

  it('sends changes straight to the server again once the queue has drained or only holds failed items', async () => {
    setOnline(false);
    await service.updateInventoryItem('item-1', { name: 'First name' });
    setOnline(true);
    queue.updateStatus(queue.getAll()[0].id, 'failed', 'rejected by the server');
    mockUpdateItem.mockResolvedValue({ id: 'item-2' });

    const result = await service.updateInventoryItem('item-2', { name: 'Unrelated' });

    expect(result.queuedOffline).toBe(false);
    expect(mockUpdateItem).toHaveBeenCalledTimes(1);
  });

  it('does not queue a change the server rejected', async () => {
    setOnline(true);
    mockCreateTeam.mockRejectedValueOnce(new Error('new row violates row-level security policy'));

    await expect(service.createTeam(team, USER)).rejects.toThrow('row-level security');
    expect(queue.getCount()).toBe(0);
  });

  it('queues a work order for equipment created offline even when connected, so sync can swap in the real id', async () => {
    setOnline(true);

    const result = await service.createWorkOrder({
      title: 'Check new loader',
      description: '',
      equipmentId: 'offline-equip-queue-1',
      priority: 'medium',
    });
    const started = await service.updateStatus(`offline-${result.queueItemId}`, 'in_progress');

    expect(result.queuedOffline).toBe(true);
    expect(started.queuedOffline).toBe(true);
    expect(queue.getAll().map(item => item.type)).toEqual(['work_order_create', 'work_order_status']);
  });

  it('queues an edit to equipment created offline even when connected, behind its create', async () => {
    setOnline(true);

    const result = await service.updateEquipment('offline-equip-queue-1', { default_pm_template_id: 'template-1' });

    expect(result.queuedOffline).toBe(true);
    expect(mockEquipmentUpdate).not.toHaveBeenCalled();
    expect(queue.getAll()[0]).toMatchObject({
      type: 'equipment_update',
      payload: { equipmentId: 'offline-equip-queue-1', data: { default_pm_template_id: 'template-1' } },
    });
  });
});
