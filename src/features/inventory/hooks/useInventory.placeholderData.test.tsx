import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Query } from '@tanstack/react-query';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import { inventory } from '@/lib/queryKeys';
import { useInventoryItems } from './useInventory';

const useQueryMock = vi.fn();

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');

  return {
    ...actual,
    useQuery: (...args: unknown[]) => useQueryMock(...args),
  };
});

vi.mock('@/features/inventory/services/inventoryService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/inventory/services/inventoryService')>();
  return {
    ...actual,
    getInventoryItems: vi.fn(),
  };
});

type PlaceholderDataFn = (
  previousData: InventoryItem[] | undefined,
  previousQuery: Query | undefined,
) => InventoryItem[] | undefined;

function getPlaceholderDataFromLastCall(): PlaceholderDataFn {
  const config = useQueryMock.mock.calls.at(-1)?.[0] as { placeholderData: PlaceholderDataFn };
  return config.placeholderData;
}

function makePreviousQuery(orgId: string): Query {
  return {
    queryKey: inventory.list(orgId, {}),
  } as Query;
}

describe('useInventoryItems placeholderData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQueryMock.mockReturnValue({ data: [], isPending: false });
  });

  it('retains previous data for same-organization filter changes', () => {
    renderHook(() => useInventoryItems('org-1', { lowStockOnly: true }));

    const placeholderData = getPlaceholderDataFromLastCall();
    const previousItems = [{ id: 'item-1' } as InventoryItem];

    expect(
      placeholderData(previousItems, makePreviousQuery('org-1')),
    ).toBe(previousItems);
  });

  it('does not retain previous data when organization changes', () => {
    renderHook(() => useInventoryItems('org-2', {}));

    const placeholderData = getPlaceholderDataFromLastCall();
    const previousItems = [{ id: 'item-1' } as InventoryItem];

    expect(
      placeholderData(previousItems, makePreviousQuery('org-1')),
    ).toBeUndefined();
  });
});
