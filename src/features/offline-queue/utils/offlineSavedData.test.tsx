import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useBrowserOnline', () => ({
  useBrowserOnline: vi.fn(() => false),
}));

import { useBrowserOnline } from '@/hooks/useBrowserOnline';
import { offlineSavedKeys, pageOf, useOfflineSavedList } from './offlineSavedData';

function setup() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('useOfflineSavedList', () => {
  const key = offlineSavedKeys.inventoryList('org-1');

  it('returns the saved copy when there is no connection', () => {
    vi.mocked(useBrowserOnline).mockReturnValue(false);
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(key, [{ id: 'item-1' }]);

    const { result } = renderHook(() => useOfflineSavedList<{ id: string }>(key), { wrapper });

    expect(result.current).toEqual([{ id: 'item-1' }]);
  });

  it('stays out of the way while connected, where the server is the source', () => {
    vi.mocked(useBrowserOnline).mockReturnValue(true);
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(key, [{ id: 'item-1' }]);

    const { result } = renderHook(() => useOfflineSavedList<{ id: string }>(key), { wrapper });

    expect(result.current).toBeUndefined();
  });

  it('returns nothing when no copy was saved or the list is not known yet', () => {
    vi.mocked(useBrowserOnline).mockReturnValue(false);
    const { wrapper } = setup();

    expect(renderHook(() => useOfflineSavedList(key), { wrapper }).result.current).toBeUndefined();
    expect(renderHook(() => useOfflineSavedList(undefined), { wrapper }).result.current).toBeUndefined();
  });
});

describe('offline saved keys', () => {
  it('start with a family the offline read cache saves and name the organization', () => {
    expect(offlineSavedKeys.equipmentList('org-1', 'org-admin')).toEqual(['equipment', 'org-1', 'offline-list', 'org-admin']);
    expect(offlineSavedKeys.workOrderList('org-1', 'team-a')).toEqual(['work-orders', 'org-1', 'offline-list', 'team-a']);
    expect(offlineSavedKeys.inventoryList('org-1')).toEqual(['inventory', 'org-1', 'offline-list']);
  });
});

describe('pageOf', () => {
  it('returns one page of a list', () => {
    const rows = [1, 2, 3, 4, 5];
    expect(pageOf(rows, 1, 2)).toEqual([1, 2]);
    expect(pageOf(rows, 3, 2)).toEqual([5]);
    expect(pageOf(rows, 4, 2)).toEqual([]);
  });
});
