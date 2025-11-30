import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import WorkOrderCard from './WorkOrderCard';
import { WorkOrdersEmptyState } from './WorkOrdersEmptyState';
import { EnhancedWorkOrder } from '@/services/workOrdersEnhancedService';

interface WorkOrdersListProps {
  workOrders: EnhancedWorkOrder[];
  onAcceptClick: (workOrder: EnhancedWorkOrder) => void;
  onStatusUpdate: (workOrderId: string, newStatus: string) => void;
  isUpdating: boolean;
  isAccepting: boolean;
  hasActiveFilters: boolean;
  onCreateClick: () => void;
  onAssignClick?: () => void;
  onReopenClick?: () => void;
}

export const WorkOrdersList: React.FC<WorkOrdersListProps> = ({
  workOrders,
  onAcceptClick,
  onStatusUpdate,
  isUpdating,
  isAccepting,
  hasActiveFilters,
  onCreateClick,
  onAssignClick,
  onReopenClick
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (workOrders.length === 0) {
    return (
      <WorkOrdersEmptyState 
        hasActiveFilters={hasActiveFilters}
        onCreateClick={onCreateClick}
      />
    );
  }

  return (
    <div className="space-y-4">
      {workOrders.map((order) => (
        <WorkOrderCard
          key={order.id}
          workOrder={order}
          variant={isMobile ? 'mobile' : 'desktop'}
          onNavigate={(id) => navigate(`/dashboard/work-orders/${id}`)}
          onAcceptClick={onAcceptClick}
          onStatusUpdate={onStatusUpdate}
          isUpdating={isUpdating}
          isAccepting={isAccepting}
          onAssignClick={onAssignClick}
          onReopenClick={onReopenClick}
        />
      ))}
    </div>
  );
};