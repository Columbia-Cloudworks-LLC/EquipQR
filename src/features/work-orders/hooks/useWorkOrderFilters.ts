import { useState, useMemo, useCallback } from 'react';
import { WorkOrderFilters, WorkOrderData } from '@/features/work-orders/types/workOrder';
import {
  countActiveWorkOrderFilters,
  DEFAULT_WORK_ORDER_FILTERS,
  filterWorkOrders,
  nextPresetsAfterFilterChange,
  PRESET_FILTER_MAP,
  sortWorkOrders,
} from './workOrderFilterUtils';

export type QuickFilterPreset = 'my-work' | 'urgent' | 'overdue' | 'unassigned';
export type SortField = 'created' | 'due_date' | 'priority' | 'status';
export type SortDirection = 'asc' | 'desc';

export const useWorkOrderFilters = (workOrders: WorkOrderData[], currentUserId?: string) => {
  const [filters, setFilters] = useState<WorkOrderFilters>(DEFAULT_WORK_ORDER_FILTERS);
  const [activePresets, setActivePresets] = useState<Set<QuickFilterPreset>>(new Set());
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredWorkOrders = useMemo(() => {
    return filterWorkOrders(workOrders, filters, currentUserId);
  }, [workOrders, filters, currentUserId]);

  const sortedWorkOrders = useMemo(() => {
    return sortWorkOrders(filteredWorkOrders, sortField, sortDirection);
  }, [filteredWorkOrders, sortField, sortDirection]);

  // `filters.teamFilter` is driven by the global TopBar selection and is
  // intentionally excluded from the page-local active-filter count / chip row.
  const getActiveFilterCount = useCallback(() => {
    return countActiveWorkOrderFilters(filters);
  }, [filters]);

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_WORK_ORDER_FILTERS);
    setActivePresets(new Set());
  }, []);

  const toggleQuickFilter = useCallback((preset: QuickFilterPreset) => {
    setActivePresets(prev => {
      const wasActive = prev.has(preset);
      const mapping = PRESET_FILTER_MAP[preset];

      setFilters(f => {
        const resetPresetFilters: WorkOrderFilters = {
          ...f,
          assigneeFilter: 'all',
          priorityFilter: 'all',
          dueDateFilter: 'all',
        };

        if (wasActive) {
          return resetPresetFilters;
        }

        return {
          ...resetPresetFilters,
          [mapping.key]: mapping.value,
        };
      });

      return wasActive ? new Set() : new Set([preset]);
    });
  }, []);

  const updateFilter = useCallback((key: keyof WorkOrderFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setActivePresets(prev => nextPresetsAfterFilterChange(prev, key, value));
  }, []);

  const updateSort = useCallback((field: SortField, direction?: SortDirection) => {
    if (direction) {
      setSortField(field);
      setSortDirection(direction);
    } else {
      setSortField(prev => {
        if (prev === field) {
          setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        } else {
          setSortDirection(field === 'due_date' ? 'asc' : 'desc');
        }
        return field;
      });
    }
  }, []);

  return {
    filters,
    filteredWorkOrders: sortedWorkOrders,
    totalCount: workOrders.length,
    activePresets,
    sortField,
    sortDirection,
    getActiveFilterCount,
    clearAllFilters,
    toggleQuickFilter,
    updateFilter,
    updateSort
  };
};

