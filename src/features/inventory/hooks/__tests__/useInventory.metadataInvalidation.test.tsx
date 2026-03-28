import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAdjustInventoryQuantity,
  useCreateInventoryItem,
  useDeleteInventoryItem,
  useUpdateInventoryItem,
} from '../useInventory';

const invalidateQueries = vi.fn();
const toast = vi.fn();

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');

  return {
    ...actual,
    useMutation: vi.fn((config) => config),
    useQueryClient: vi.fn(() => ({
      invalidateQueries,
    })),
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
  })),
}));

vi.mock('@/hooks/useAppToast', () => ({
  useAppToast: vi.fn(() => ({
    toast,
  })),
}));

describe('inventory metadata invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates list metadata after creating an inventory item', () => {
    const { result } = renderHook(() => useCreateInventoryItem());

    result.current.onSuccess(
      { name: 'New Part' },
      { organizationId: 'org-1', formData: {} }
    );

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['inventory-list-metadata', 'org-1'],
    });
  });

  it('invalidates list metadata after updating an inventory item', () => {
    const { result } = renderHook(() => useUpdateInventoryItem());

    result.current.onSuccess(
      { name: 'Updated Part' },
      { organizationId: 'org-1', itemId: 'item-1', formData: {} }
    );

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['inventory-list-metadata', 'org-1'],
    });
  });

  it('invalidates list metadata after deleting an inventory item', () => {
    const { result } = renderHook(() => useDeleteInventoryItem());

    result.current.onSuccess(undefined, {
      organizationId: 'org-1',
      itemId: 'item-1',
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['inventory-list-metadata', 'org-1'],
    });
  });

  it('invalidates list metadata after adjusting inventory quantity', () => {
    const { result } = renderHook(() => useAdjustInventoryQuantity());

    result.current.onSuccess(6, {
      organizationId: 'org-1',
      adjustment: {
        itemId: 'item-1',
        delta: 1,
        reason: 'Quick add',
      },
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['inventory-list-metadata', 'org-1'],
    });
  });
});
