import { useState, useMemo, useCallback } from 'react';
import { isToday, isThisWeek } from 'date-fns';
import { WorkOrderFilters, WorkOrderData } from '@/features/work-orders/types/workOrder';
import { getPriorityValue, isOverdue } from '@/features/work-orders/utils/workOrderHelpers';

export type QuickFilterPreset = 'my-work' | 'urgent' | 'overdue' | 'unassigned';
export type SortField = 'created' | 'due_date' | 'priority' | 'status';
export type SortDirection = 'asc' | 'desc';

const STATUS_ORDER: Record<string, number> = {
  submitted: 0, accepted: 1, assigned: 2, in_progress: 3, on_hold: 4, completed: 5, cancelled: 6,
};

const PRESET_FILTER_MAP: Record<QuickFilterPreset, { key: keyof WorkOrderFilters; value: string }> = {
  'my-work':    { key: 'assigneeFilter', value: 'mine' },
  'urgent':     { key: 'priorityFilter', value: 'high' },
  'overdue':    { key: 'dueDateFilter',  value: 'overdue' },
  'unassigned': { key: 'assigneeFilter', value: 'unassigned' },
};

export const useWorkOrderFilters = (workOrders: WorkOrderData[], currentUserId?: string) => {
  const [filters, setFilters] = useState<WorkOrderFilters>({
    searchQuery: '',
    statusFilter: 'all',
    assigneeFilter: 'all',
    teamFilter: 'all',
    priorityFilter: 'all',
    dueDateFilter: 'all'
  });
  const [activePresets, setActivePresets] = useState<Set<QuickFilterPreset>>(new Set());
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(order => {
      const matchesSearch = order.title.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                           order.assigneeName?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                           order.teamName?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
                           order.equipmentName?.toLowerCase().includes(filters.searchQuery.toLowerCase());
      
      const matchesStatus = filters.statusFilter === 'all' || order.status === filters.statusFilter;
      
      const matchesAssignee = filters.assigneeFilter === 'all' || 
                             (filters.assigneeFilter === 'mine' && order.assigneeId === currentUserId) ||
                             (filters.assigneeFilter === 'unassigned' && !order.assigneeId && !order.teamId) ||
                             order.assigneeId === filters.assigneeFilter;
      
      const matchesTeam = filters.teamFilter === 'all' || order.teamId === filters.teamFilter;
      const matchesPriority = filters.priorityFilter === 'all' || order.priority === filters.priorityFilter;
      
      const matchesDueDate = filters.dueDateFilter === 'all' || 
                            (filters.dueDateFilter === 'overdue' && isOverdue(order.dueDate, order.status)) ||
                            (filters.dueDateFilter === 'today' && order.dueDate && isToday(new Date(order.dueDate))) ||
                            (filters.dueDateFilter === 'this_week' && order.dueDate && isThisWeek(new Date(order.dueDate)));
      
      return matchesSearch && matchesStatus && matchesAssignee && matchesTeam && matchesPriority && matchesDueDate;
    });
  }, [workOrders, filters, currentUserId]);

  const sortedWorkOrders = useMemo(() => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...filteredWorkOrders].sort((a, b) => {
      switch (sortField) {
        case 'due_date': {
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return (aDate - bDate) * dir;
        }
        case 'priority':
          return (getPriorityValue(b.priority) - getPriorityValue(a.priority)) * dir;
        case 'status':
          return ((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)) * dir;
        case 'created':
        default: {
          const aC = new Date(a.createdDate || a.created_date).getTime();
          const bC = new Date(b.createdDate || b.created_date).getTime();
          return (aC - bC) * dir;
        }
      }
    });
  }, [filteredWorkOrders, sortField, sortDirection]);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.statusFilter !== 'all') count++;
    if (filters.assigneeFilter !== 'all') count++;
    if (filters.teamFilter !== 'all') count++;
    if (filters.priorityFilter !== 'all') count++;
    if (filters.dueDateFilter !== 'all') count++;
    return count;
  }, [filters]);

  const clearAllFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      statusFilter: 'all',
      assigneeFilter: 'all',
      teamFilter: 'all',
      priorityFilter: 'all',
      dueDateFilter: 'all'
    });
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
    setActivePresets(prev => {
      const next = new Set(prev);
      let changed = false;
      for (const [presetKey, mapping] of Object.entries(PRESET_FILTER_MAP)) {
        if (mapping.key === key && next.has(presetKey as QuickFilterPreset) && mapping.value !== value) {
          next.delete(presetKey as QuickFilterPreset);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
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

