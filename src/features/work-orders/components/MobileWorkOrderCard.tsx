import React from 'react';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import WorkOrderCard from './WorkOrderCard';

interface MobileWorkOrderCardProps {
  order: WorkOrder;
  onAcceptClick: (order: WorkOrder) => void;
  onStatusUpdate: (workOrderId: string, newStatus: string) => void;
  isUpdating: boolean;
  isAccepting: boolean;
  onAssignClick?: () => void;
  onReopenClick?: () => void;
}

const MobileWorkOrderCard: React.FC<MobileWorkOrderCardProps> = ({
  order,
  onAcceptClick,
  onStatusUpdate,
  isUpdating,
  isAccepting,
  onAssignClick,
  onReopenClick
}) => {
  return (
    <WorkOrderCard
      workOrder={order}
      variant="mobile"
      onAcceptClick={onAcceptClick}
      onStatusUpdate={onStatusUpdate}
      isUpdating={isUpdating}
      isAccepting={isAccepting}
      onAssignClick={onAssignClick}
      onReopenClick={onReopenClick}
    />
  );
};

export default MobileWorkOrderCard;
