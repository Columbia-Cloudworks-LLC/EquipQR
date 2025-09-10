/**
 * Base Hook utilities for standardizing React Query patterns
 * Provides common hook patterns and error handling
 * Follows SOLID principles with composition over inheritance
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiResponse, FilterParams, PaginationParams } from '../types/common';
import { TOAST_MESSAGES } from '../constants';
import { logger } from '../../utils/logger';

/**
 * Standard query options for consistency
 */
export interface StandardQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  staleTime?: number;
  cacheTime?: number;
  retry?: boolean | number;
  refetchOnWindowFocus?: boolean;
}

/**
 * Standard mutation options for consistency
 */
export interface StandardMutationOptions<TData, TVariables> extends Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'> {
  onSuccessMessage?: string;
  onErrorMessage?: string;
  showToast?: boolean;
}

/**
 * Hook factory for creating standardized query hooks
 */
export function createQueryHook<TData, TParams = void>(
  queryKey: string | ((params: TParams) => string),
  queryFn: (params: TParams) => Promise<ApiResponse<TData>>,
  options: StandardQueryOptions<TData> = {}
) {
  return function useStandardQuery(params: TParams, hookOptions: StandardQueryOptions<TData> = {}) {
    const mergedOptions = { ...options, ...hookOptions };
    
    return useQuery({
      queryKey: typeof queryKey === 'function' ? [queryKey(params)] : [queryKey, params],
      queryFn: async () => {
        try {
          const response = await queryFn(params);
          if (!response.success) {
            throw new Error(response.error || 'Query failed');
          }
          return response.data;
        } catch (error) {
          logger.error(`Query error for ${typeof queryKey === 'function' ? queryKey(params) : queryKey}:`, error);
          throw error;
        }
      },
      enabled: mergedOptions.enabled !== false,
      staleTime: mergedOptions.staleTime ?? 5 * 60 * 1000, // 5 minutes
      cacheTime: mergedOptions.cacheTime ?? 10 * 60 * 1000, // 10 minutes
      retry: mergedOptions.retry ?? 3,
      refetchOnWindowFocus: mergedOptions.refetchOnWindowFocus ?? false,
      ...mergedOptions
    });
  };
}

/**
 * Hook factory for creating standardized mutation hooks
 */
export function createMutationHook<TData, TVariables, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options: StandardMutationOptions<TData, TVariables> = {}
) {
  return function useStandardMutation(hookOptions: StandardMutationOptions<TData, TVariables> = {}) {
    const queryClient = useQueryClient();
    const mergedOptions = { ...options, ...hookOptions };
    
    return useMutation({
      mutationFn: async (variables: TVariables) => {
        try {
          const response = await mutationFn(variables);
          if (!response.success) {
            throw new Error(response.error || 'Mutation failed');
          }
          return response.data;
        } catch (error) {
          logger.error('Mutation error:', error);
          throw error;
        }
      },
      onSuccess: (data, variables, context) => {
        // Show success toast if enabled
        if (mergedOptions.showToast !== false && mergedOptions.onSuccessMessage) {
          toast.success(mergedOptions.onSuccessMessage);
        }
        
        // Call custom onSuccess if provided
        if (mergedOptions.onSuccess) {
          mergedOptions.onSuccess(data, variables, context);
        }
      },
      onError: (error, variables, context) => {
        // Show error toast if enabled
        if (mergedOptions.showToast !== false) {
          const errorMessage = mergedOptions.onErrorMessage || error.message || 'Operation failed';
          toast.error(errorMessage);
        }
        
        // Call custom onError if provided
        if (mergedOptions.onError) {
          mergedOptions.onError(error, variables, context);
        }
      },
      ...mergedOptions
    });
  };
}

/**
 * Hook for invalidating queries
 */
export function useQueryInvalidation() {
  const queryClient = useQueryClient();
  
  const invalidateQueries = (queryKey: string | string[], exact: boolean = false) => {
    queryClient.invalidateQueries({ 
      queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
      exact 
    });
  };
  
  const invalidateAll = () => {
    queryClient.invalidateQueries();
  };
  
  const removeQueries = (queryKey: string | string[]) => {
    queryClient.removeQueries({ 
      queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] 
    });
  };
  
  return {
    invalidateQueries,
    invalidateAll,
    removeQueries
  };
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticUpdate<TData, TVariables>(
  queryKey: string | string[],
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData
) {
  const queryClient = useQueryClient();
  
  const updateOptimistically = (variables: TVariables) => {
    queryClient.setQueryData(
      Array.isArray(queryKey) ? queryKey : [queryKey],
      (oldData: TData | undefined) => updateFn(oldData, variables)
    );
  };
  
  const revertOptimisticUpdate = () => {
    queryClient.invalidateQueries({ 
      queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] 
    });
  };
  
  return {
    updateOptimistically,
    revertOptimisticUpdate
  };
}

/**
 * Hook for paginated data
 */
export function usePaginatedQuery<TData, TParams = FilterParams>(
  queryKey: string,
  queryFn: (params: TParams & PaginationParams) => Promise<ApiResponse<{ data: TData[]; pagination: any }>>,
  params: TParams = {} as TParams,
  options: StandardQueryOptions<{ data: TData[]; pagination: any }> = {}
) {
  return useQuery({
    queryKey: [queryKey, params],
    queryFn: async () => {
      try {
        const response = await queryFn(params as TParams & PaginationParams);
        if (!response.success) {
          throw new Error(response.error || 'Query failed');
        }
        return response.data;
      } catch (error) {
        logger.error(`Paginated query error for ${queryKey}:`, error);
        throw error;
      }
    },
    enabled: options.enabled !== false,
    staleTime: options.staleTime ?? 5 * 60 * 1000,
    cacheTime: options.cacheTime ?? 10 * 60 * 1000,
    retry: options.retry ?? 3,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    ...options
  });
}

/**
 * Hook for infinite scroll data
 */
export function useInfiniteQuery<TData, TParams = FilterParams>(
  queryKey: string,
  queryFn: (params: TParams & { pageParam?: number }) => Promise<ApiResponse<{ data: TData[]; nextCursor?: number }>>,
  params: TParams = {} as TParams,
  options: StandardQueryOptions<TData[]> = {}
) {
  return useQuery({
    queryKey: [queryKey, params],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        const response = await queryFn({ ...params, pageParam } as TParams & { pageParam: number });
        if (!response.success) {
          throw new Error(response.error || 'Query failed');
        }
        return response.data;
      } catch (error) {
        logger.error(`Infinite query error for ${queryKey}:`, error);
        throw error;
      }
    },
    enabled: options.enabled !== false,
    staleTime: options.staleTime ?? 5 * 60 * 1000,
    cacheTime: options.cacheTime ?? 10 * 60 * 1000,
    retry: options.retry ?? 3,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    ...options
  });
}

/**
 * Hook for CRUD operations
 */
export function useCrudHooks<TData, TCreateData, TUpdateData>(
  entityName: string,
  service: {
    findById: (id: string) => Promise<ApiResponse<TData>>;
    findMany: (filters?: FilterParams) => Promise<ApiResponse<TData[]>>;
    create: (data: TCreateData) => Promise<ApiResponse<TData>>;
    update: (id: string, data: TUpdateData) => Promise<ApiResponse<TData>>;
    delete: (id: string) => Promise<ApiResponse<void>>;
  }
) {
  const queryClient = useQueryClient();
  
  // Query hooks
  const useEntity = (id: string) => createQueryHook(
    `${entityName}-${id}`,
    () => service.findById(id)
  )();
  
  const useEntities = (filters?: FilterParams) => createQueryHook(
    `${entityName}-list`,
    () => service.findMany(filters)
  )();
  
  // Mutation hooks
  const useCreateEntity = createMutationHook(
    service.create,
    {
      onSuccessMessage: `${entityName} created successfully`,
      onErrorMessage: `Failed to create ${entityName}`,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`${entityName}-list`] });
      }
    }
  );
  
  const useUpdateEntity = createMutationHook(
    ({ id, data }: { id: string; data: TUpdateData }) => service.update(id, data),
    {
      onSuccessMessage: `${entityName} updated successfully`,
      onErrorMessage: `Failed to update ${entityName}`,
      onSuccess: (data, { id }) => {
        queryClient.invalidateQueries({ queryKey: [`${entityName}-${id}`] });
        queryClient.invalidateQueries({ queryKey: [`${entityName}-list`] });
      }
    }
  );
  
  const useDeleteEntity = createMutationHook(
    (id: string) => service.delete(id),
    {
      onSuccessMessage: `${entityName} deleted successfully`,
      onErrorMessage: `Failed to delete ${entityName}`,
      onSuccess: (_, id) => {
        queryClient.invalidateQueries({ queryKey: [`${entityName}-${id}`] });
        queryClient.invalidateQueries({ queryKey: [`${entityName}-list`] });
      }
    }
  );
  
  return {
    useEntity,
    useEntities,
    useCreateEntity,
    useUpdateEntity,
    useDeleteEntity
  };
}

/**
 * Hook for handling loading states
 */
export function useLoadingState() {
  const [isLoading, setIsLoading] = useState(false);
  
  const withLoading = async <T>(operation: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    try {
      const result = await operation();
      return result;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    isLoading,
    withLoading
  };
}

// Import useState for the loading state hook
import { useState } from 'react';
