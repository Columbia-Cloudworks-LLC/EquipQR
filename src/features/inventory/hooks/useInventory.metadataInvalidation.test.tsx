import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inventory } from '@/lib/queryKeys';
import {
  useAdjustInventoryQuantity,
  useCreateInventoryItem,
  useDeleteInventoryItem,
  useUpdateInventoryItem,
} from './useInventory';

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

type MutationSuccessHandler = (data: unknown, variables: unknown) => void;

function isMutationSuccessHandler(value: unknown): value is MutationSuccessHandler {
  return typeof value === 'function';
}

/** `useMutation` is mocked above to return its options, so read `onSuccess` back from them. */
function getOnSuccess(mutation: object): MutationSuccessHandler {
  if ('onSuccess' in mutation && isMutationSuccessHandler(mutation.onSuccess)) {
    return mutation.onSuccess;
  }
  throw new Error('Expected the mocked mutation to expose onSuccess');
}

describe('inventory metadata invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates list metadata after creating an inventory item', () => {
    const { result } = renderHook(() => useCreateInventoryItem());

    getOnSuccess(result.current)(
      { name: 'New Part' },
      { organizationId: 'org-1', formData: {} }
    );

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: inventory.metadata('org-1'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: inventory.listPrefix('org-1'),
    });
  });

  it('invalidates list metadata after updating an inventory item', () => {
    const { result } = renderHook(() => useUpdateInventoryItem());

    getOnSuccess(result.current)(
      { name: 'Updated Part' },
      { organizationId: 'org-1', itemId: 'item-1', formData: {} }
    );

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: inventory.metadata('org-1'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: inventory.listPrefix('org-1'),
    });
  });

  it('invalidates list metadata after deleting an inventory item', () => {
    const { result } = renderHook(() => useDeleteInventoryItem());

    getOnSuccess(result.current)(undefined, {
      organizationId: 'org-1',
      itemId: 'item-1',
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: inventory.metadata('org-1'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: inventory.listPrefix('org-1'),
    });
  });

  it('invalidates list metadata after adjusting inventory quantity', () => {
    const { result } = renderHook(() => useAdjustInventoryQuantity());

    getOnSuccess(result.current)(6, {
      organizationId: 'org-1',
      adjustment: {
        itemId: 'item-1',
        delta: 1,
        reason: 'Quick add',
      },
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: inventory.metadata('org-1'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: inventory.listPrefix('org-1'),
    });
  });
});
