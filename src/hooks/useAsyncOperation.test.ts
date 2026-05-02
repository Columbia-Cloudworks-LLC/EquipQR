/**
 * useAsyncOperation Hook Tests
 *
 * Covers the full state machine for async operations including:
 * - Initial state
 * - Happy-path execution (data, isSuccess, isLoading transitions)
 * - Error-path execution (error message, isSuccess false)
 * - resetOnExecute option
 * - onSuccess / onError callbacks
 * - reset() helper
 * - setData() helper
 * - Non-Error thrown values
 * - Multiple sequential executions
 *
 * Intentionally deferred: concurrent/overlapping execute() calls where
 * Promise interleaving would require more invasive concurrency control.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAsyncOperation } from './useAsyncOperation';

const createDeferred = <T>() => {
  let resolve: (value: T) => void = () => {
    throw new Error('Deferred promise resolved before initialization');
  };

  const promise = new Promise<T>(res => {
    resolve = res;
  });

  return { promise, resolve };
};

const startExecution = <T>(execute: () => Promise<T>): Promise<T> => {
  let executePromise: Promise<T> | undefined;

  // Flush the synchronous isLoading state update while leaving the operation pending.
  act(() => {
    executePromise = execute();
  });

  if (!executePromise) {
    throw new Error('Expected execution promise to be initialized');
  }

  return executePromise;
};

describe('useAsyncOperation', () => {
  describe('initial state', () => {
    it('starts with idle state', () => {
      const operation = vi.fn<[], Promise<string>>().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncOperation(operation));

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isSuccess).toBe(false);
    });

    it('exposes execute, reset, and setData functions', () => {
      const operation = vi.fn<[], Promise<null>>().mockResolvedValue(null);
      const { result } = renderHook(() => useAsyncOperation(operation));

      expect(typeof result.current.execute).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.setData).toBe('function');
    });
  });

  describe('execute — happy path', () => {
    it('sets isLoading true while the operation is pending', async () => {
      const pendingOperation = createDeferred<string>();
      const operation = vi.fn<[], Promise<string>>(() => pendingOperation.promise);
      const { result } = renderHook(() => useAsyncOperation(operation));

      const executePromise = startExecution(() => result.current.execute());

      expect(result.current.isLoading).toBe(true);

      // Clean up: resolve the pending operation so no dangling state updates.
      await act(async () => {
        pendingOperation.resolve('done');
        await executePromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets data and isSuccess after a successful operation', async () => {
      const operation = vi.fn<[], Promise<{ id: string }>>().mockResolvedValue({ id: '1' });
      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toEqual({ id: '1' });
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('returns the resolved value from execute()', async () => {
      const operation = vi.fn<[], Promise<string>>().mockResolvedValue('hello');
      const { result } = renderHook(() => useAsyncOperation(operation));

      let returnedValue: string | null = null;
      await act(async () => {
        returnedValue = await result.current.execute();
      });

      expect(returnedValue).toBe('hello');
    });

    it('passes extra arguments through to the underlying operation', async () => {
      const operation = vi.fn<unknown[], Promise<string>>().mockResolvedValue('ok');
      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute('arg1', 42, { key: 'value' });
      });

      expect(operation).toHaveBeenCalledWith('arg1', 42, { key: 'value' });
    });
  });

  describe('execute — error path', () => {
    it('sets error message when the operation throws an Error', async () => {
      const operation = vi.fn<[], Promise<never>>().mockRejectedValue(
        new Error('Something went wrong')
      );
      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe('Something went wrong');
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeNull();
    });

    it('sets "Operation failed" for non-Error thrown values', async () => {
      const operation = vi.fn<[], Promise<never>>().mockRejectedValue('plain string error');
      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe('Operation failed');
    });

    it('returns null when the operation throws', async () => {
      const operation = vi.fn<[], Promise<never>>().mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() => useAsyncOperation(operation));

      let returnedValue: string | null = 'sentinel' as string | null;
      await act(async () => {
        returnedValue = await result.current.execute();
      });

      expect(returnedValue).toBeNull();
    });
  });

  describe('options.onSuccess callback', () => {
    it('calls onSuccess with the result after a successful operation', async () => {
      const onSuccess = vi.fn<(data: { id: string }) => void>();
      const operation = vi.fn<[], Promise<{ id: string }>>().mockResolvedValue({ id: '42' });
      const { result } = renderHook(() =>
        useAsyncOperation(operation, { onSuccess })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).toHaveBeenCalledOnce();
      expect(onSuccess).toHaveBeenCalledWith({ id: '42' });
    });

    it('does not call onSuccess when the operation fails', async () => {
      const onSuccess = vi.fn<(data: never) => void>();
      const operation = vi.fn<[], Promise<never>>().mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() =>
        useAsyncOperation(operation, { onSuccess })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('options.onError callback', () => {
    it('calls onError with the error message when the operation throws', async () => {
      const onError = vi.fn<(error: string) => void>();
      const operation = vi.fn<[], Promise<never>>().mockRejectedValue(
        new Error('network down')
      );
      const { result } = renderHook(() =>
        useAsyncOperation(operation, { onError })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).toHaveBeenCalledOnce();
      expect(onError).toHaveBeenCalledWith('network down');
    });

    it('does not call onError on a successful operation', async () => {
      const onError = vi.fn<(error: string) => void>();
      const operation = vi.fn<[], Promise<string>>().mockResolvedValue('all good');
      const { result } = renderHook(() =>
        useAsyncOperation(operation, { onError })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('options.resetOnExecute', () => {
    it('clears previous data to null at the start of each new execution when true', async () => {
      const secondExecution = createDeferred<string>();

      const operation = vi.fn<[], Promise<string>>()
        .mockResolvedValueOnce('first')
        .mockImplementationOnce(() => secondExecution.promise);

      const { result } = renderHook(() =>
        useAsyncOperation(operation, { resetOnExecute: true })
      );

      // First execution completes
      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.data).toBe('first');

      // Second execution begins: data should be cleared immediately
      const executeSecondPromise = startExecution(() => result.current.execute());

      expect(result.current.data).toBeNull();

      // Resolve and clean up
      await act(async () => {
        secondExecution.resolve('second');
        await executeSecondPromise;
      });

      expect(result.current.data).toBe('second');
    });

    it('preserves previous data during a new execution when resetOnExecute is false (default)', async () => {
      const secondExecution = createDeferred<string>();

      const operation = vi.fn<[], Promise<string>>()
        .mockResolvedValueOnce('first')
        .mockImplementationOnce(() => secondExecution.promise);

      const { result } = renderHook(() => useAsyncOperation(operation));

      // First execution completes
      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.data).toBe('first');

      // Second execution begins: data should still be 'first'
      const executeSecondPromise = startExecution(() => result.current.execute());

      expect(result.current.data).toBe('first');

      // Clean up
      await act(async () => {
        secondExecution.resolve('second');
        await executeSecondPromise;
      });
    });
  });

  describe('reset()', () => {
    it('clears data, error, isLoading, and isSuccess back to initial state', async () => {
      const operation = vi.fn<[], Promise<string>>().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBe('result');
      expect(result.current.isSuccess).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isSuccess).toBe(false);
    });

    it('clears error state after a failed execution', async () => {
      const operation = vi.fn<[], Promise<never>>().mockRejectedValue(new Error('oops'));
      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe('oops');

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('setData()', () => {
    it('updates data and marks isSuccess true without running the operation', () => {
      const operation = vi.fn<[], Promise<string>>().mockResolvedValue('should-not-be-called');
      const { result } = renderHook(() => useAsyncOperation(operation));

      act(() => {
        result.current.setData('manual value');
      });

      expect(result.current.data).toBe('manual value');
      expect(result.current.isSuccess).toBe(true);
      expect(operation).not.toHaveBeenCalled();
    });

    it('can override data even after a prior successful execution', async () => {
      const operation = vi.fn<[], Promise<string>>().mockResolvedValue('original');
      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBe('original');

      act(() => {
        result.current.setData('override');
      });

      expect(result.current.data).toBe('override');
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('multiple sequential executions', () => {
    it('reflects the result of the most recent completed execution', async () => {
      const operation = vi.fn<[], Promise<string>>()
        .mockResolvedValueOnce('first')
        .mockResolvedValueOnce('second');

      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.data).toBe('first');

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.data).toBe('second');
    });

    it('clears error state when a previously failed operation succeeds', async () => {
      const operation = vi.fn<[], Promise<string>>()
        .mockRejectedValueOnce(new Error('first fail'))
        .mockResolvedValueOnce('recovered');

      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.error).toBe('first fail');

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data).toBe('recovered');
      expect(result.current.isSuccess).toBe(true);
    });

    it('clears isSuccess when a previously successful operation fails', async () => {
      const operation = vi.fn<[], Promise<string>>()
        .mockResolvedValueOnce('first ok')
        .mockRejectedValueOnce(new Error('second fail'));

      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.isSuccess).toBe(true);

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.isSuccess).toBe(false);
      expect(result.current.error).toBe('second fail');
      expect(result.current.data).toBeNull();
    });
  });
});
