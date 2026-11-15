import type { QueryObserverSuccessResult } from '@tanstack/react-query';
import { vi } from 'vitest';

/** Fully typed successful `useQuery` result for mocking query hooks in tests. */
export function createSuccessQueryResult<TData>(data: TData): QueryObserverSuccessResult<TData, Error> {
  return {
    data,
    isLoading: false,
    error: null,
    isError: false,
    isPending: false,
    isSuccess: true,
    status: 'success',
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    fetchStatus: 'idle',
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isEnabled: true,
    refetch: vi.fn(),
  };
}
