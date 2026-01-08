import React from 'react';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import WorkOrderCard from './WorkOrderCard';

interface DesktopWorkOrderCardProps {
  workOrder: WorkOrder;
  onNavigate: (id: string) => void;
  onAssignClick?: () => void;
  onReopenClick?: () => void;
}

const DesktopWorkOrderCard: React.FC<DesktopWorkOrderCardProps> = ({ 
  workOrder, 
  onNavigate,
  onAssignClick,
  onReopenClick
}) => {
  return (
    <WorkOrderCard
      workOrder={workOrder}
      variant="desktop"
      onNavigate={onNavigate}
      onAssignClick={onAssignClick}
      onReopenClick={onReopenClick}
    />
  );
};

export default DesktopWorkOrderCard;

