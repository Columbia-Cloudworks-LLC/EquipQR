import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getInventoryItems,
  INVENTORY_LIST_BATCH_SIZE,
} from '@/features/inventory/services/inventoryService';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

const { supabase } = await import('@/integrations/supabase/client');

const organizationId = 'org-1';

type InventoryRow = {
  id: string;
  organization_id: string;
  name: string;
  sku: string | null;
  external_id: string | null;
  quantity_on_hand: number;
  low_stock_threshold: number;
  location: string | null;
  default_unit_cost: string | null;
  created_at: string;
  updated_at: string;
};

function makeInventoryRow(index: number, overrides: Partial<InventoryRow> = {}): InventoryRow {
  const id = `item-${index}`;
  return {
    id,
    organization_id: organizationId,
    name: `Part ${String(index).padStart(3, '0')}`,
    sku: `SKU-${index}`,
    external_id: null,
    quantity_on_hand: index % 5 === 0 ? 2 : 50,
    low_stock_threshold: 10,
    location: index % 2 === 0 ? 'Warehouse A' : 'Warehouse B',
    default_unit_cost: '1.00',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function createRangeMock(rows: InventoryRow[]) {
  const rangeCalls: Array<[number, number]> = [];

  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockImplementation((from: number, to: number) => {
      rangeCalls.push([from, to]);
      return Promise.resolve({
        data: rows.slice(from, to + 1),
        error: null,
      });
    }),
  };

  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

  return { mockQuery, rangeCalls };
}

describe('getInventoryItems list pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches inventory rows in bounded range batches until the final short page', async () => {
    const totalRows = INVENTORY_LIST_BATCH_SIZE + 1;
    const rows = Array.from({ length: totalRows }, (_, index) => makeInventoryRow(index));
    const { rangeCalls } = createRangeMock(rows);

    const items = await getInventoryItems(organizationId);

    expect(rangeCalls).toEqual([
      [0, INVENTORY_LIST_BATCH_SIZE - 1],
      [INVENTORY_LIST_BATCH_SIZE, INVENTORY_LIST_BATCH_SIZE * 2 - 1],
    ]);
    expect(items).toHaveLength(totalRows);
    expect(items[0]?.name).toBe('Part 000');
    expect(items.at(-1)?.id).toBe(`item-${totalRows - 1}`);
  });

  it('preserves sort order across batched pages', async () => {
    const rows = [
      makeInventoryRow(0, { name: 'Alpha Part', sku: 'A-1' }),
      makeInventoryRow(1, { name: 'Beta Part', sku: 'B-1' }),
      makeInventoryRow(2, { name: 'Gamma Part', sku: 'C-1' }),
    ];
    createRangeMock(rows);

    const items = await getInventoryItems(organizationId, {
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(items.map((item) => item.name)).toEqual([
      'Alpha Part',
      'Beta Part',
      'Gamma Part',
    ]);
  });

  it('applies search and location filters on each batch query', async () => {
    const rows = [makeInventoryRow(0, { name: 'Hydraulic Oil', location: 'Warehouse A' })];
    const { mockQuery } = createRangeMock(rows);

    await getInventoryItems(organizationId, {
      search: 'hydraulic',
      location: 'Warehouse A',
    });

    expect(mockQuery.or).toHaveBeenCalledWith(
      'name.ilike.%hydraulic%,sku.ilike.%hydraulic%,external_id.ilike.%hydraulic%',
    );
    expect(mockQuery.ilike).toHaveBeenCalledWith('location', '%Warehouse A%');
  });

  it('sanitizes search terms before building the PostgREST filter', async () => {
    const rows = [makeInventoryRow(0, { name: 'Bracket (Heavy)' })];
    const { mockQuery } = createRangeMock(rows);

    await getInventoryItems(organizationId, {
      search: 'bracket,(heavy)',
    });

    expect(mockQuery.or).toHaveBeenCalledWith(
      'name.ilike.%bracket heavy%,sku.ilike.%bracket heavy%,external_id.ilike.%bracket heavy%',
    );
  });

  it('uses a stable id tiebreaker when sorting batched pages', async () => {
    const { mockQuery } = createRangeMock([makeInventoryRow(0)]);

    await getInventoryItems(organizationId, {
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(mockQuery.order).toHaveBeenCalledWith('name', { ascending: true });
    expect(mockQuery.order).toHaveBeenCalledWith('id', { ascending: true });
  });

  it('applies lowStockOnly after all batches are combined', async () => {
    const rows = [
      makeInventoryRow(0, { quantity_on_hand: 50, low_stock_threshold: 10 }),
      makeInventoryRow(1, { quantity_on_hand: 2, low_stock_threshold: 10 }),
      makeInventoryRow(2, { quantity_on_hand: 0, low_stock_threshold: 10 }),
    ];
    createRangeMock(rows);

    const items = await getInventoryItems(organizationId, { lowStockOnly: true });

    expect(items).toHaveLength(2);
    expect(items.every((item) => item.isLowStock)).toBe(true);
    expect(items.map((item) => item.id)).toEqual(['item-1', 'item-2']);
  });
});
