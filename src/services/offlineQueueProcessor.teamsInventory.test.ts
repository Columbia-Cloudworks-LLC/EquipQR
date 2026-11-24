import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { OfflineQueueProcessor } from './offlineQueueProcessor';
import { OfflineQueueService } from './offlineQueueService';

type Row = Record<string, unknown>;

/** Rows each table answers a lookup with, and every insert the processor made. */
const { lookupRows, inserts, mockCreateItem, mockUpdateItem, mockAdjust, mockNewestMovement } = vi.hoisted(() => ({
  lookupRows: {} as Record<string, Row[]>,
  inserts: [] as Array<{ table: string; row: Row }>,
  mockCreateItem: vi.fn(),
  mockUpdateItem: vi.fn(),
  mockAdjust: vi.fn(),
  mockNewestMovement: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => {
  const builder = (table: string) => {
    const rows = () => lookupRows[table] ?? [];
    const chain = {
      select: () => chain,
      eq: () => chain,
      gt: () => chain,
      limit: () => Promise.resolve({ data: rows(), error: null }),
      maybeSingle: () => Promise.resolve({ data: rows()[0] ?? null, error: null }),
      insert: (row: Row) => {
        inserts.push({ table, row });
        return Promise.resolve({ error: null });
      },
    };
    return chain;
  };
  return { supabase: { from: builder } };
});

vi.mock('./offlineQueueSession', () => ({
  ensureActiveOfflineSession: () => Promise.resolve(true),
}));

vi.mock('@/features/inventory/services/inventoryService', () => ({
  createInventoryItem: (...args: unknown[]) => mockCreateItem(...args),
  updateInventoryItem: (...args: unknown[]) => mockUpdateItem(...args),
  adjustInventoryQuantity: (...args: unknown[]) => mockAdjust(...args),
  getNewestInventoryMovementTime: (...args: unknown[]) => mockNewestMovement(...args),
}));

const USER = 'user-1';
const ORG = 'org-1';
const TEAM_ID = '11111111-1111-4111-8111-111111111111';
const ITEM_ID = '22222222-2222-4222-8222-222222222222';

const itemForm = {
  name: 'Oil filter',
  quantity_on_hand: 4,
  low_stock_threshold: 2,
  compatibleEquipmentIds: [],
  compatibilityRules: [],
  alternateGroupMode: 'none' as const,
};

function setup() {
  const queue = new OfflineQueueService(USER, ORG);
  const processor = new OfflineQueueProcessor(queue, new QueryClient());
  return { queue, processor };
}

describe('offline replay of teams and inventory', () => {
  beforeEach(() => {
    localStorage.clear();
    inserts.length = 0;
    for (const table of Object.keys(lookupRows)) delete lookupRows[table];
    mockCreateItem.mockReset().mockResolvedValue({ id: ITEM_ID });
    mockUpdateItem.mockReset().mockResolvedValue({ id: ITEM_ID });
    mockAdjust.mockReset().mockResolvedValue(5);
    mockNewestMovement.mockReset().mockResolvedValue('2026-11-24T12:00:00.000Z');
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('creates a queued team under the id chosen on the device, with its creator as manager', async () => {
    const { queue, processor } = setup();
    queue.enqueue({
      type: 'team_create',
      organizationId: ORG,
      userId: USER,
      payload: { team: { id: TEAM_ID, name: 'Night crew', organization_id: ORG }, creatorId: USER },
    });

    const result = await processor.processAll();

    expect(result.succeeded).toBe(1);
    expect(inserts).toEqual([
      { table: 'teams', row: { id: TEAM_ID, name: 'Night crew', organization_id: ORG } },
      { table: 'team_members', row: { team_id: TEAM_ID, user_id: USER, role: 'manager' } },
    ]);
    expect(queue.getAll()).toHaveLength(0);
  });

  it('does not create the team twice when an earlier attempt already reached the server', async () => {
    const { queue, processor } = setup();
    lookupRows.teams = [{ id: TEAM_ID }];
    queue.enqueue({
      type: 'team_create',
      organizationId: ORG,
      userId: USER,
      payload: { team: { id: TEAM_ID, name: 'Night crew', organization_id: ORG }, creatorId: USER },
    });

    await processor.processAll();

    // Only the membership the earlier attempt never got to.
    expect(inserts.map(insert => insert.table)).toEqual(['team_members']);
  });

  it('creates a queued inventory item once, under the id chosen on the device', async () => {
    const { queue, processor } = setup();
    queue.enqueue({
      type: 'inventory_create',
      organizationId: ORG,
      userId: USER,
      payload: { itemId: ITEM_ID, formData: itemForm },
    });
    await processor.processAll();
    expect(mockCreateItem).toHaveBeenCalledWith(ORG, itemForm, USER, ITEM_ID);

    mockCreateItem.mockClear();
    lookupRows.inventory_items = [{ id: ITEM_ID }];
    const second = setup();
    second.queue.enqueue({
      type: 'inventory_create',
      organizationId: ORG,
      userId: USER,
      payload: { itemId: ITEM_ID, formData: itemForm },
    });
    const result = await second.processor.processAll();
    expect(result.succeeded).toBe(1);
    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('finishes linking equipment when an earlier attempt created the item and was then cut off', async () => {
    const { queue, processor } = setup();
    lookupRows.inventory_items = [{ id: ITEM_ID }];
    const formData = { ...itemForm, compatibleEquipmentIds: ['equipment-1'] };
    queue.enqueue({
      type: 'inventory_create',
      organizationId: ORG,
      userId: USER,
      payload: { itemId: ITEM_ID, formData },
    });

    await processor.processAll();

    expect(mockCreateItem).not.toHaveBeenCalled();
    expect(mockUpdateItem).toHaveBeenCalledWith(ORG, ITEM_ID, {
      name: 'Oil filter',
      compatibleEquipmentIds: ['equipment-1'],
      compatibilityRules: [],
    });
  });

  it('checks for an already recorded movement when the change was cut off while still online', async () => {
    const { queue, processor } = setup();
    // Queued by the online path, which had read the newest movement first.
    queue.enqueue({
      type: 'inventory_adjust',
      organizationId: ORG,
      userId: USER,
      payload: { itemId: ITEM_ID, delta: 5, reason: 'Delivery', lastMovementBeforeReplay: '2026-11-24T11:00:00.000Z' },
    });
    lookupRows.inventory_transactions = [{ id: 'movement-1' }];

    const result = await processor.processAll();

    expect(result.succeeded).toBe(1);
    expect(mockAdjust).not.toHaveBeenCalled();
    expect(mockNewestMovement).not.toHaveBeenCalled();
  });

  it('replays an edit and a stock change in the order they were made', async () => {
    const { queue, processor } = setup();
    queue.enqueue({
      type: 'inventory_update',
      organizationId: ORG,
      userId: USER,
      payload: { itemId: ITEM_ID, formData: { low_stock_threshold: 7 } },
    });
    queue.enqueue({
      type: 'inventory_adjust',
      organizationId: ORG,
      userId: USER,
      payload: { itemId: ITEM_ID, delta: -3, reason: 'Used on site' },
    });

    const result = await processor.processAll();

    expect(result.succeeded).toBe(2);
    expect(mockUpdateItem).toHaveBeenCalledWith(ORG, ITEM_ID, { low_stock_threshold: 7 });
    expect(mockAdjust).toHaveBeenCalledWith(ORG, { itemId: ITEM_ID, delta: -3, reason: 'Used on site' });
  });

  it('keeps retrying a stock change the server rejected instead of treating it as sent', async () => {
    const { queue, processor } = setup();
    queue.enqueue({
      type: 'inventory_adjust',
      organizationId: ORG,
      userId: USER,
      payload: { itemId: ITEM_ID, delta: -1, reason: 'Manual adjustment' },
    });
    mockAdjust.mockRejectedValue(new Error('Insufficient stock: requested 1 units, but only 0 available'));

    await processor.processAll();
    const second = await processor.processAll();

    expect(second.succeeded).toBe(0);
    expect(mockAdjust).toHaveBeenCalledTimes(2);
    expect(queue.getAll()[0]).toMatchObject({ status: 'pending', retryCount: 2 });
  });

  it('does not count stock twice when the connection dropped before the first answer arrived', async () => {
    const { queue, processor } = setup();
    queue.enqueue({
      type: 'inventory_adjust',
      organizationId: ORG,
      userId: USER,
      payload: { itemId: ITEM_ID, delta: 5, reason: 'Delivery' },
    });

    // First attempt: the request leaves, the answer never arrives.
    mockAdjust.mockRejectedValueOnce(new Error('TypeError: Failed to fetch'));
    const first = await processor.processAll();
    expect(first.interrupted).toBe(true);
    expect(queue.getAll()[0].status).toBe('pending');

    // The server did record it. The retry finds the movement and stops there.
    lookupRows.inventory_transactions = [{ id: 'movement-1' }];
    const second = await processor.processAll();
    expect(second.succeeded).toBe(1);
    expect(mockAdjust).toHaveBeenCalledTimes(1);
    expect(queue.getAll()).toHaveLength(0);
  });

  it('sends the stock change again when the cut-off attempt never reached the server', async () => {
    const { queue, processor } = setup();
    queue.enqueue({
      type: 'inventory_adjust',
      organizationId: ORG,
      userId: USER,
      payload: { itemId: ITEM_ID, delta: 5, reason: 'Delivery' },
    });
    mockAdjust.mockRejectedValueOnce(new Error('TypeError: Failed to fetch'));
    await processor.processAll();

    expect(queue.getAll()[0].payload).toMatchObject({ lastMovementBeforeReplay: '2026-11-24T12:00:00.000Z' });

    const second = await processor.processAll();

    expect(second.succeeded).toBe(1);
    expect(mockAdjust).toHaveBeenCalledTimes(2);
  });
});
