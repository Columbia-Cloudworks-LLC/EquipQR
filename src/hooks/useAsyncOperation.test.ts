import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAsyncOperation } from './useAsyncOperation';

describe('useAsyncOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with null data, not loading, no error, not successful', () => {
      const operation = vi.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncOperation(operation));

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isSuccess).toBe(false);
    });

    it('exposes execute, reset, and setData functions', () => {
      const operation = vi.fn().mockResolvedValue('result');
      const { result } = renderHook(() => useAsyncOperation(operation));

      expect(typeof result.current.execute).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.setData).toBe('function');
    });
  });

  describe('execute — happy path', () => {
    it('sets isLoading true while operation is running', async () => {
      let resolveOp!: (value: string) => void;
      const operation = vi.fn(
        () => new Promise<string>((resolve) => { resolveOp = resolve; })
      );
      const { result } = renderHook(() => useAsyncOperation(operation));

      act(() => {
        void result.current.execute();
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();

      await act(async () => {
        resolveOp('done');
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets data and isSuccess after successful execution', async () => {
      const operation = vi.fn().mockResolvedValue({ id: '1', name: 'test' });
      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toEqual({ id: '1', name: 'test' });
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('passes arguments through to the underlying operation', async () => {
      const operation = vi.fn().mockResolvedValue('ok');
      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute('arg1', 42, { key: 'value' });
      });

      expect(operation).toHaveBeenCalledWith('arg1', 42, { key: 'value' });
    });

    it('returns the operation result from execute()', async () => {
      const operation = vi.fn().mockResolvedValue('payload');
      const { result } = renderHook(() => useAsyncOperation(operation));

      let returnValue: string | null = null;
      await act(async () => {
        returnValue = await result.current.execute() as string | null;
      });

      expect(returnValue).toBe('payload');
    });

    it('calls onSuccess callback with the result', async () => {
      const onSuccess = vi.fn();
      const operation = vi.fn().mockResolvedValue({ id: '42' });
      const { result } = renderHook(() =>
        useAsyncOperation(operation, { onSuccess })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).toHaveBeenCalledOnce();
      expect(onSuccess).toHaveBeenCalledWith({ id: '42' });
    });
  });

  describe('execute — error path', () => {
    it('sets error message and clears data on failure', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network unavailable'));
      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe('Network unavailable');
      expect(result.current.data).toBeNull();
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('returns null from execute() when the operation fails', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() => useAsyncOperation(operation));

      let returnValue: unknown = 'sentinel';
      await act(async () => {
        returnValue = await result.current.execute();
      });

      expect(returnValue).toBeNull();
    });

    it('uses "Operation failed" message for non-Error throwables', async () => {
      const operation = vi.fn().mockRejectedValue('just a string error');
      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe('Operation failed');
    });

    it('calls onError callback with the error message', async () => {
      const onError = vi.fn();
      const operation = vi.fn().mockRejectedValue(new Error('Something broke'));
      const { result } = renderHook(() =>
        useAsyncOperation(operation, { onError })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).toHaveBeenCalledOnce();
      expect(onError).toHaveBeenCalledWith('Something broke');
    });

    it('does not call onSuccess when the operation fails', async () => {
      const onSuccess = vi.fn();
      const operation = vi.fn().mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() =>
        useAsyncOperation(operation, { onSuccess })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('resetOnExecute option', () => {
    it('clears previous data when resetOnExecute is true', async () => {
      // Use a controlled promise so we can inspect state mid-flight
      let resolveSecond!: (value: string) => void;
      const operation = vi.fn()
        .mockResolvedValueOnce('first')
        .mockImplementationOnce(
          () => new Promise<string>((r) => { resolveSecond = r; })
        );

      const { result } = renderHook(() =>
        useAsyncOperation(operation, { resetOnExecute: true })
      );

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.data).toBe('first');

      // Second execute should reset state before resolving
      act(() => {
        void result.current.execute();
      });

      // While pending, previous data should be cleared due to resetOnExecute
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSecond('second');
      });

      expect(result.current.data).toBe('second');
    });

    it('preserves previous data between executes when resetOnExecute is false (default)', async () => {
      const operation = vi.fn()
        .mockResolvedValueOnce('first');

      const { result } = renderHook(() =>
        useAsyncOperation(operation)
      );

      await act(async () => {
        await result.current.execute();
      });
      expect(result.current.data).toBe('first');

      let resolvePending!: (value: string) => void;
      operation.mockImplementationOnce(
        () => new Promise<string>((r) => { resolvePending = r; })
      );

      act(() => {
        void result.current.execute();
      });

      // Data from first call should still be visible while second is loading
      expect(result.current.data).toBe('first');
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePending('second');
      });
    });
  });

  describe('reset', () => {
    it('resets state back to initial values', async () => {
      const operation = vi.fn().mockResolvedValue('result');
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

    it('clears an error state', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('fail'));
      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe('fail');

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('setData', () => {
    it('sets data directly and marks isSuccess true', () => {
      const operation = vi.fn().mockResolvedValue('unused');
      const { result } = renderHook(() => useAsyncOperation<string>(operation));

      act(() => {
        result.current.setData('injected');
      });

      expect(result.current.data).toBe('injected');
      expect(result.current.isSuccess).toBe(true);
    });

    it('does not reset other state fields when setting data', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('prior error'));
      const { result } = renderHook(() => useAsyncOperation<string>(operation));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe('prior error');

      act(() => {
        result.current.setData('override');
      });

      // setData only patches data + isSuccess; it does NOT clear error
      expect(result.current.data).toBe('override');
      expect(result.current.isSuccess).toBe(true);
      // error remains unchanged because setData does a partial state update
      expect(result.current.error).toBe('prior error');
    });
  });

  describe('no-callback scenario', () => {
    it('works correctly when no options are provided', async () => {
      const operation = vi.fn().mockResolvedValue(42);
      const { result } = renderHook(() => useAsyncOperation(operation));

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBe(42);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });
});
