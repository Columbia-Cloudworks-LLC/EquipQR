
import { useState, useCallback } from 'react';

export interface AsyncOperationState<T = unknown> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

export interface AsyncOperationHook<T = unknown, TArgs extends unknown[] = unknown[]>
  extends AsyncOperationState<T> {
  execute: (...args: TArgs) => Promise<T | null>;
  reset: () => void;
  setData: (data: T) => void;
}

export const useAsyncOperation = <T = unknown, TArgs extends unknown[] = unknown[]>(
  operation: (...args: TArgs) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
    resetOnExecute?: boolean;
  } = {}
): AsyncOperationHook<T, TArgs> => {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    isLoading: false,
    error: null,
    isSuccess: false
  });

  const execute = useCallback(async (...args: TArgs): Promise<T | null> => {
    if (options.resetOnExecute) {
      setState({
        data: null,
        isLoading: true,
        error: null,
        isSuccess: false
      });
    } else {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        isSuccess: false
      }));
    }

    try {
      const result = await operation(...args);
      setState({
        data: result,
        isLoading: false,
        error: null,
        isSuccess: true
      });
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed';
      setState({
        data: null,
        isLoading: false,
        error: errorMessage,
        isSuccess: false
      });
      
      if (options.onError) {
        options.onError(errorMessage);
      }
      
      return null;
    }
  }, [operation, options]);

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      isSuccess: false
    });
  }, []);

  const setData = useCallback((data: T) => {
    setState(prev => ({
      ...prev,
      data,
      isSuccess: true
    }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData
  };
};
