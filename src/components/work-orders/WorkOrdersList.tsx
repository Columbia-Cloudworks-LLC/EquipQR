import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileWorkOrderCard from '@/components/work-orders/MobileWorkOrderCard';
import DesktopWorkOrderCard from '@/components/work-orders/DesktopWorkOrderCard';
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
        isMobile ? (
          <MobileWorkOrderCard
            key={order.id}
            order={order}
            onAcceptClick={onAcceptClick}
            onStatusUpdate={onStatusUpdate}
            isUpdating={isUpdating}
            isAccepting={isAccepting}
            onAssignClick={onAssignClick}
            onReopenClick={onReopenClick}
          />
        ) : (
          <DesktopWorkOrderCard
            key={order.id}
            workOrder={order}
            onNavigate={(id) => navigate(`/dashboard/work-orders/${id}`)}
            onAssignClick={onAssignClick}
            onReopenClick={onReopenClick}
          />
        )
      ))}
    </div>
  );
};