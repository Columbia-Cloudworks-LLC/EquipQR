import { describe, expect, it } from 'vitest';
import type { OfflineQueueItem } from '@/services/offlineQueueService';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import type { EquipmentWithTeam } from '@/features/equipment/services/EquipmentService';
import { applyQueuedWorkOrderChanges } from './queuedWorkOrderChanges';
import {
  applyQueuedEquipmentUpdates,
  buildQueuedEquipmentRecord,
  findQueuedEquipmentCreate,
} from './queuedEquipment';
import {
  isPendingSyncItem,
  mergeQueuedInventory,
  queuedEntriesForUnsyncedItem,
  resolveQueuedInventoryItem,
} from './queuedInventory';

const ORG = 'org-1';
const USER = 'user-1';
let sequence = 0;

/** A queue item as the queue service stores it, queued one second after the previous one. */
function queued<T extends OfflineQueueItem['type']>(
  type: T,
  payload: Extract<OfflineQueueItem, { type: T }>['payload'],
  status: OfflineQueueItem['status'] = 'pending',
): OfflineQueueItem {
  sequence += 1;
  return {
    id: `queue-${sequence}`,
    type,
    payload,
    status,
    organizationId: ORG,
    userId: USER,
    timestamp: Date.UTC(2026, 10, 24, 12, 0, sequence),
    retryCount: 0,
    maxRetries: 5,
    payloadSizeBytes: 0,
  } as OfflineQueueItem;
}

const workOrder = {
  id: 'wo-1',
  status: 'assigned',
  assignee_id: 'tech-1',
  assigneeName: 'Tom Technician',
  title: 'Replace filter',
  completed_date: null,
  updated_at: '2026-11-01T00:00:00.000Z',
} as WorkOrder;

describe('work order changes waiting in the offline queue', () => {
  it('shows the latest queued status so the next step can be taken offline', () => {
    const started = [queued('work_order_status', { workOrderId: 'wo-1', newStatus: 'in_progress' })];
    expect(applyQueuedWorkOrderChanges(workOrder, started).status).toBe('in_progress');

    const paused = [...started, queued('work_order_status', { workOrderId: 'wo-1', newStatus: 'on_hold' })];
    expect(applyQueuedWorkOrderChanges(workOrder, paused).status).toBe('on_hold');

    const completedItem = queued('work_order_status', { workOrderId: 'wo-1', newStatus: 'completed' });
    const completed = applyQueuedWorkOrderChanges(workOrder, [...paused, completedItem]);
    expect(completed.status).toBe('completed');
    expect(completed.completed_date).toBe(new Date(completedItem.timestamp).toISOString());
  });

  it('keeps the server timestamp, which later queued changes send as their conflict baseline', () => {
    const changed = applyQueuedWorkOrderChanges(workOrder, [
      queued('work_order_status', { workOrderId: 'wo-1', newStatus: 'in_progress' }),
      queued('work_order_update', { workOrderId: 'wo-1', data: { title: 'Replace both filters' } }),
    ]);
    expect(changed.title).toBe('Replace both filters');
    expect(changed.updated_at).toBe(workOrder.updated_at);
  });

  it('shows a queued assignment with the name saved on the device, and a queued unassignment', () => {
    const names = (id: string) => (id === 'tech-2' ? 'Amanda Admin' : undefined);
    const reassigned = applyQueuedWorkOrderChanges(
      workOrder,
      [queued('work_order_status', { workOrderId: 'wo-1', newStatus: 'assigned', assigneeId: 'tech-2' })],
      names,
    );
    expect(reassigned.assignee_id).toBe('tech-2');
    expect(reassigned.assigneeName).toBe('Amanda Admin');

    const unassigned = applyQueuedWorkOrderChanges(
      workOrder,
      [queued('work_order_status', { workOrderId: 'wo-1', newStatus: 'accepted', assigneeId: null })],
      names,
    );
    expect(unassigned.assignee_id).toBeNull();
    expect(unassigned.assigneeName).toBeUndefined();
  });

  it('ignores other work orders and changes that failed to sync', () => {
    const untouched = applyQueuedWorkOrderChanges(workOrder, [
      queued('work_order_status', { workOrderId: 'wo-2', newStatus: 'completed' }),
      queued('work_order_status', { workOrderId: 'wo-1', newStatus: 'cancelled' }, 'failed'),
    ]);
    expect(untouched).toBe(workOrder);
  });
});

describe('equipment waiting in the offline queue', () => {
  const teamFor = (id: string) => (id === 'team-new' ? { id, name: 'Night crew' } : undefined);
  const create = queued('equipment_create_full', {
    name: 'Kubota KX040',
    manufacturer: 'Kubota',
    model: 'KX040',
    serial_number: 'KX-1',
    status: 'active',
    location: 'Yard',
    installation_date: '2026-11-24',
    team_id: 'team-new',
  });
  const placeholderId = `offline-equip-${create.id}`;

  it('can be opened before it syncs, in the team it was created in', () => {
    const found = findQueuedEquipmentCreate(placeholderId, [create]);
    expect(found).toBe(create);

    const record = buildQueuedEquipmentRecord(found!, teamFor);
    expect(record).toMatchObject({
      id: placeholderId,
      name: 'Kubota KX040',
      team_id: 'team-new',
      team: { id: 'team-new', name: 'Night crew' },
      default_pm_template_id: null,
      _isPendingSync: true,
    });
  });

  it('is not found once its create has synced or failed', () => {
    expect(findQueuedEquipmentCreate(placeholderId, [])).toBeUndefined();
    expect(findQueuedEquipmentCreate(placeholderId, [{ ...create, status: 'failed' }])).toBeUndefined();
    expect(findQueuedEquipmentCreate('a-server-id', [create])).toBeUndefined();
  });

  it('shows a PM template and a team change queued for it', () => {
    const record = buildQueuedEquipmentRecord(findQueuedEquipmentCreate(placeholderId, [create])!, teamFor);
    const changed = applyQueuedEquipmentUpdates(
      record,
      [
        queued('equipment_update', { equipmentId: placeholderId, data: { default_pm_template_id: 'template-1' } }),
        queued('equipment_update', { equipmentId: placeholderId, data: { team_id: null } }),
        queued('equipment_update', { equipmentId: 'other', data: { name: 'Not this one' } }),
      ],
      teamFor,
    );
    expect(changed.default_pm_template_id).toBe('template-1');
    expect(changed.team_id).toBeNull();
    expect(changed.team).toBeNull();
    expect(changed.name).toBe('Kubota KX040');
  });

  it('moves existing equipment into a team created offline', () => {
    const existing = { id: 'eq-1', name: 'CAT 320', team_id: 'team-old', team: { id: 'team-old', name: 'Old' } } as EquipmentWithTeam;
    const moved = applyQueuedEquipmentUpdates(
      existing,
      [queued('equipment_update', { equipmentId: 'eq-1', data: { team_id: 'team-new' } })],
      teamFor,
    );
    expect(moved.team).toEqual({ id: 'team-new', name: 'Night crew' });
    expect(applyQueuedEquipmentUpdates(existing, [], teamFor)).toBe(existing);
  });
});

describe('inventory waiting in the offline queue', () => {
  const saved = {
    id: 'item-1',
    organization_id: ORG,
    name: 'Air filter',
    quantity_on_hand: 3,
    low_stock_threshold: 2,
  } as InventoryItem;
  const form = {
    name: 'Hydraulic hose',
    quantity_on_hand: 10,
    low_stock_threshold: 4,
    compatibleEquipmentIds: [],
    compatibilityRules: [],
    alternateGroupMode: 'none' as const,
  };

  it('adds stock changes made offline to the saved quantity, and flags low stock', () => {
    const [item] = mergeQueuedInventory(
      [saved],
      [
        queued('inventory_adjust', { itemId: 'item-1', delta: 2, reason: 'Delivery' }),
        queued('inventory_adjust', { itemId: 'item-1', delta: -4, reason: 'Used' }),
        queued('inventory_adjust', { itemId: 'item-2', delta: 50, reason: 'Other item' }),
      ],
      ORG,
    );
    expect(item.quantity_on_hand).toBe(1);
    expect(item.isLowStock).toBe(true);
  });

  it('lists an item created offline, with the edits and stock changes made to it since', () => {
    const items = mergeQueuedInventory(
      [saved],
      [
        queued('inventory_create', { itemId: 'item-new', formData: form }),
        queued('inventory_update', { itemId: 'item-new', formData: { name: 'Hydraulic hose 3/4"' } }),
        queued('inventory_adjust', { itemId: 'item-new', delta: -7, reason: 'Used' }),
      ],
      ORG,
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: 'item-new',
      name: 'Hydraulic hose 3/4"',
      quantity_on_hand: 3,
      isLowStock: true,
      _isPendingSync: true,
    });
    expect(items[1]).toBe(saved);
  });

  it('does not list an offline item twice once the server copy has arrived', () => {
    const create = queued('inventory_create', { itemId: 'item-1', formData: form });
    expect(mergeQueuedInventory([saved], [create], ORG)).toHaveLength(1);
  });

  it('opens an item created offline from the queue, and leaves unknown items alone', () => {
    const create = queued('inventory_create', { itemId: 'item-new', formData: form });
    expect(resolveQueuedInventoryItem('item-new', undefined, [create])).toMatchObject({ name: 'Hydraulic hose' });
    expect(resolveQueuedInventoryItem('item-x', null, [create])).toBeNull();
    expect(resolveQueuedInventoryItem('item-1', saved, [create])).toBe(saved);
  });

  it('deleting an item that has not synced removes its create and later changes from the queue', () => {
    const create = queued('inventory_create', { itemId: 'item-new', formData: form });
    const edit = queued('inventory_update', { itemId: 'item-new', formData: { name: 'Renamed' } });
    const count = queued('inventory_adjust', { itemId: 'item-new', delta: -1, reason: 'Used' });
    const other = queued('inventory_adjust', { itemId: 'item-1', delta: -1, reason: 'Used' });

    expect(queuedEntriesForUnsyncedItem('item-new', [create, edit, count, other])).toEqual([
      create.id,
      edit.id,
      count.id,
    ]);
    // An item that is already on the server is deleted there, not in the queue.
    expect(queuedEntriesForUnsyncedItem('item-1', [create, other])).toEqual([]);
  });

  it('marks only items still waiting to be created as pending', () => {
    const [pending] = mergeQueuedInventory([], [queued('inventory_create', { itemId: 'item-new', formData: form })], ORG);
    expect(isPendingSyncItem(pending)).toBe(true);
    expect(isPendingSyncItem(saved)).toBe(false);
    expect(isPendingSyncItem(null)).toBe(false);
  });
});
