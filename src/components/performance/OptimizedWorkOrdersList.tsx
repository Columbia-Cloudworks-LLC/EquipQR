import React, { memo, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Calendar } from 'lucide-react';
import OptimizedWorkOrderCard from './OptimizedWorkOrderCard';
import { useDebouncedSearch } from '@/hooks/useDebounced';
import { WorkOrder } from '@/services/optimizedSupabaseDataService';
import { useWorkOrderStats } from '@/hooks/useOptimizedQueries';

interface OptimizedWorkOrdersListProps {
  workOrders: WorkOrder[];
  organizationId?: string;
  onViewClick?: (id: string) => void;
  onEditClick?: (id: string) => void;
  isLoading?: boolean;
}

// PHASE 2: Optimized work orders list with smart filtering
const OptimizedWorkOrdersList = memo(({
  workOrders,
  organizationId,
  onViewClick,
  onEditClick,
  isLoading = false
}: OptimizedWorkOrdersListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // PHASE 3: Use enhanced queries with background sync
  const stats = useWorkOrderStats(organizationId);

  // Optimized search with debouncing
  const { filteredItems: searchFiltered } = useDebouncedSearch(
    workOrders,
    searchTerm,
    ['title', 'description', 'assigneeName', 'equipmentName']
  );

  // Memoized filtering
  const filteredWorkOrders = useMemo(() => {
    let filtered = searchFiltered;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(wo => wo.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(wo => wo.priority === priorityFilter);
    }

    return filtered;
  }, [searchFiltered, statusFilter, priorityFilter]);

  // Memoized sorting
  const sortedWorkOrders = useMemo(() => {
    return [...filteredWorkOrders].sort((a, b) => {
      // Priority: high > medium > low
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then by creation date (newest first)
      return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
    });
  }, [filteredWorkOrders]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-card rounded-lg border">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total Orders</div>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
          <div className="text-sm text-muted-foreground">In Progress</div>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          <div className="text-sm text-muted-foreground">Overdue</div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search work orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1">
            <span className="text-sm font-medium">Status:</span>
            {['all', 'submitted', 'in_progress', 'completed'].map(status => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ')}
                {status !== 'all' && stats.byStatus[status] && (
                  <Badge variant="secondary" className="ml-1">
                    {stats.byStatus[status]}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
          
          <div className="flex gap-1">
            <span className="text-sm font-medium">Priority:</span>
            {['all', 'high', 'medium', 'low'].map(priority => (
              <Button
                key={priority}
                variant={priorityFilter === priority ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriorityFilter(priority)}
              >
                {priority === 'all' ? 'All' : priority}
                {priority !== 'all' && stats.byPriority[priority] && (
                  <Badge variant="secondary" className="ml-1">
                    {stats.byPriority[priority]}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedWorkOrders.length} of {workOrders.length} work orders
      </div>

      {/* Work orders list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedWorkOrders.map(workOrder => (
          <OptimizedWorkOrderCard
            key={workOrder.id}
            workOrder={workOrder}
            onViewClick={onViewClick}
            onEditClick={onEditClick}
          />
        ))}
      </div>

      {sortedWorkOrders.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No work orders found matching your criteria.</p>
        </div>
      )}
    </div>
  );
});

OptimizedWorkOrdersList.displayName = 'OptimizedWorkOrdersList';

export default OptimizedWorkOrdersList;