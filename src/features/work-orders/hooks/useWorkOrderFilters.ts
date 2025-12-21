import { useState, useMemo, useCallback } from 'react';
import { isToday, isThisWeek } from 'date-fns';
import { WorkOrderFilters, WorkOrderData } from '@/features/work-orders/types/workOrder';

export const useWorkOrderFilters = (workOrders: WorkOrderData[], currentUserId?: string) => {
  const [filters, setFilters] = useState<WorkOrderFilters>({
    searchQuery: '',
    statusFilter: 'all',
    assigneeFilter: 'all',
    teamFilter: 'all',
    priorityFilter: 'all',
    dueDateFilter: 'all'
  });

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
                            (filters.dueDateFilter === 'overdue' && order.dueDate && new Date(order.dueDate) < new Date()) ||
                            (filters.dueDateFilter === 'today' && order.dueDate && isToday(new Date(order.dueDate))) ||
                            (filters.dueDateFilter === 'this_week' && order.dueDate && isThisWeek(new Date(order.dueDate)));
      
      return matchesSearch && matchesStatus && matchesAssignee && matchesTeam && matchesPriority && matchesDueDate;
    });
  }, [workOrders, filters, currentUserId]);

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
  }, []);

  const applyQuickFilter = useCallback((preset: string) => {
    const newFilters = {
      searchQuery: '',
      statusFilter: 'all',
      assigneeFilter: 'all',
      teamFilter: 'all',
      priorityFilter: 'all',
      dueDateFilter: 'all'
    };
    
    switch (preset) {
      case 'my-work':
        newFilters.assigneeFilter = 'mine';
        break;
      case 'urgent':
        newFilters.priorityFilter = 'high';
        break;
      case 'overdue':
        newFilters.dueDateFilter = 'overdue';
        break;
      case 'unassigned':
        newFilters.assigneeFilter = 'unassigned';
        break;
    }
    setFilters(newFilters);
  }, []);

  const updateFilter = useCallback((key: keyof WorkOrderFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  return {
    filters,
    filteredWorkOrders,
    getActiveFilterCount,
    clearAllFilters,
    applyQuickFilter,
    updateFilter
  };
};

