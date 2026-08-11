import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  invalidateWorkOrderCaches,
  invalidateWorkOrderLists,
  invalidateWorkOrderRecord,
} from './invalidateWorkOrderQueries';

describe('invalidateWorkOrderQueries', () => {
  it('invalidates the detail record key used by WorkOrderDetails', () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateWorkOrderRecord(queryClient, 'org-1', 'wo-1');

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['work-orders', 'detail', 'org-1', 'wo-1'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['work-orders', 'org-1', 'wo-1'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['workOrder', 'org-1', 'wo-1'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['workOrder', 'enhanced', 'org-1', 'wo-1'],
    });
  });

  it('invalidates list caches for the organization', () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateWorkOrderLists(queryClient, 'org-1');

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['work-orders', 'list'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['enhanced-work-orders', 'org-1'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['workOrders', 'org-1'],
    });
  });

  it('invalidates record and list caches together', () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateWorkOrderCaches(queryClient, 'org-1', 'wo-1');

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['work-orders', 'detail', 'org-1', 'wo-1'],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['enhanced-work-orders', 'org-1'],
    });
  });
});
