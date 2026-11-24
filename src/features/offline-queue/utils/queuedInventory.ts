/**
 * Inventory as the offline queue will leave it: items created with no
 * connection, edits, and stock added or removed, all still waiting to sync.
 */
import type {
  OfflineQueueInventoryCreateItem,
  OfflineQueueItem,
} from '@/services/offlineQueueService';
import type { QueryClient } from '@tanstack/react-query';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import { offlineSavedKeys } from '@/features/offline-queue/utils/offlineSavedData';
import type { InventoryItemFormData } from '@/features/inventory/schemas/inventorySchema';
import { toInventoryItemUpdate } from '@/features/inventory/services/inventoryService';
import { isLiveQueueItem } from '@/features/offline-queue/utils/queuedWorkOrderChanges';

/** An item that exists only in the offline queue until it syncs. */
export type QueuedInventoryItem = InventoryItem & { _isPendingSync?: boolean };

/** True for an item that was created offline and is still waiting to sync. */
export function isPendingSyncItem(item: InventoryItem | null | undefined): boolean {
  return !!item && '_isPendingSync' in item && item._isPendingSync === true;
}

/**
 * True while a queued edit to this item changes its equipment links or
 * compatibility rules. Until it syncs the server still holds the old ones,
 * so an edit form must not read them back and save them over the queued change.
 */
export function hasQueuedRelationshipEdit(
  itemId: string | undefined,
  queuedItems: readonly OfflineQueueItem[],
): boolean {
  return queuedItems.some(
    item =>
      item.type === 'inventory_update' &&
      isLiveQueueItem(item) &&
      item.payload.itemId === itemId &&
      (item.payload.formData.compatibleEquipmentIds !== undefined ||
        item.payload.formData.compatibilityRules !== undefined),
  );
}

/**
 * Ids of the queue entries that create, change or use this item, when the item
 * itself is still waiting to be created. Deleting such an item means taking
 * these out of the queue: there is nothing on the server to delete, and left
 * in place the create would bring the item back on the next sync.
 */
export function queuedEntriesForUnsyncedItem(
  itemId: string,
  queuedItems: readonly OfflineQueueItem[],
): string[] {
  const entries = queuedItems.filter(
    item =>
      (item.type === 'inventory_create' ||
        item.type === 'inventory_update' ||
        item.type === 'inventory_adjust' ||
        // A part taken from this item for a work order: it cannot sync
        // without the item, so it goes with it.
        item.type === 'work_order_part_use') &&
      item.payload.itemId === itemId,
  );
  return entries.some(isQueuedInventoryCreate) ? entries.map(item => item.id) : [];
}

function isQueuedInventoryCreate(item: OfflineQueueItem): item is OfflineQueueInventoryCreateItem {
  return item.type === 'inventory_create' && isLiveQueueItem(item);
}

function withLowStock<T extends InventoryItem>(item: T): T {
  return { ...item, isLowStock: item.quantity_on_hand <= item.low_stock_threshold };
}

/** The item an offline create will produce, under the id generated on the device. */
export function buildPendingInventoryItem(input: {
  itemId: string;
  organizationId: string;
  userId: string;
  formData: InventoryItemFormData;
  queuedAt: number;
}): QueuedInventoryItem {
  const { itemId, formData } = input;
  const createdAt = new Date(input.queuedAt).toISOString();
  return withLowStock({
    id: itemId,
    organization_id: input.organizationId,
    name: formData.name,
    description: formData.description || null,
    sku: formData.sku || null,
    external_id: formData.external_id || null,
    quantity_on_hand: formData.quantity_on_hand,
    low_stock_threshold: formData.low_stock_threshold,
    location: formData.location || null,
    location_address: formData.location_address || null,
    location_city: formData.location_city || null,
    location_state: formData.location_state || null,
    location_country: formData.location_country || null,
    location_lat: formData.location_lat ?? null,
    location_lng: formData.location_lng ?? null,
    default_unit_cost: formData.default_unit_cost || null,
    image_url: null,
    created_by: input.userId,
    created_by_name: null,
    created_at: createdAt,
    updated_at: createdAt,
    compatibleEquipmentCount: formData.compatibleEquipmentIds?.length ?? 0,
    _isPendingSync: true,
  });
}

function buildQueuedInventoryItem(item: OfflineQueueInventoryCreateItem): QueuedInventoryItem {
  return buildPendingInventoryItem({
    itemId: item.payload.itemId,
    organizationId: item.organizationId,
    userId: item.userId,
    formData: item.payload.formData,
    queuedAt: item.timestamp,
  });
}

/**
 * The item with its queued edits and stock changes applied, oldest first.
 * Returns the same object when nothing is queued for it.
 */
export function applyQueuedInventoryChanges<T extends InventoryItem>(
  inventoryItem: T,
  queuedItems: readonly OfflineQueueItem[],
): T {
  let next = inventoryItem;
  for (const item of queuedItems) {
    if (!isLiveQueueItem(item)) continue;
    if (item.type === 'inventory_update' && item.payload.itemId === inventoryItem.id) {
      next = { ...next, ...toInventoryItemUpdate(item.payload.formData) };
    } else if (item.type === 'inventory_adjust' && item.payload.itemId === inventoryItem.id) {
      next = { ...next, quantity_on_hand: next.quantity_on_hand + item.payload.delta };
    } else if (item.type === 'work_order_part_use' && item.payload.itemId === inventoryItem.id) {
      // A part used on a work order offline: its stock deduction is queued with the cost line.
      next = { ...next, quantity_on_hand: next.quantity_on_hand - item.payload.quantity };
    }
  }
  return next === inventoryItem ? inventoryItem : withLowStock(next);
}

/** One item as queued changes leave it, whether it came from the server or the queue. */
export function resolveQueuedInventoryItem(
  itemId: string | undefined,
  saved: InventoryItem | null | undefined,
  queuedItems: readonly OfflineQueueItem[],
): QueuedInventoryItem | null | undefined {
  if (!itemId || queuedItems.length === 0) return saved;
  const created = saved
    ? undefined
    : queuedItems.filter(isQueuedInventoryCreate).find(item => item.payload.itemId === itemId);
  const base = saved ?? (created ? buildQueuedInventoryItem(created) : undefined);
  return base ? applyQueuedInventoryChanges(base, queuedItems) : saved;
}

/** A list with queued changes applied and items created offline added (when not already listed). */
export function mergeQueuedInventory(
  items: readonly InventoryItem[],
  queuedItems: readonly OfflineQueueItem[],
  organizationId: string | undefined,
): QueuedInventoryItem[] {
  const listed = items.map(item => applyQueuedInventoryChanges(item, queuedItems));
  const created = queuedItems
    .filter(isQueuedInventoryCreate)
    .filter(item => item.organizationId === organizationId)
    .filter(item => !items.some(existing => existing.id === item.payload.itemId))
    .map(item => applyQueuedInventoryChanges(buildQueuedInventoryItem(item), queuedItems));
  return [...created, ...listed];
}

/**
 * What this device knows about an inventory item right now: its saved record
 * (or the copy in the saved list) with queued changes applied. Used to name
 * and stock-check a part with no connection. `undefined` when it is not saved.
 */
export function findKnownInventoryItem(
  queryClient: QueryClient,
  organizationId: string,
  itemId: string,
  queuedItems: readonly OfflineQueueItem[],
): QueuedInventoryItem | undefined {
  const saved =
    queryClient.getQueryData<InventoryItem | null>(['inventory-item', organizationId, itemId]) ??
    queryClient
      .getQueryData<InventoryItem[]>(offlineSavedKeys.inventoryList(organizationId))
      ?.find(item => item.id === itemId);
  if (saved) return applyQueuedInventoryChanges(saved, queuedItems);
  return resolveQueuedInventoryItem(itemId, undefined, queuedItems) ?? undefined;
}
