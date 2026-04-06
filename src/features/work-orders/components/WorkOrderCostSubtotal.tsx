
import React from 'react';
import { DollarSign } from 'lucide-react';
import { useWorkOrderCostsSubtotal } from '@/features/work-orders/hooks/useWorkOrderCostsSubtotal';
import { formatCurrency } from '@/utils/currencyUtils';

interface WorkOrderCostSubtotalProps {
  workOrderId: string;
  className?: string;
  hideWhenEmpty?: boolean;
}

const WorkOrderCostSubtotal: React.FC<WorkOrderCostSubtotalProps> = ({ 
  workOrderId, 
  className = "",
  hideWhenEmpty = false,
}) => {
  const { data: subtotalCents = 0, isLoading } = useWorkOrderCostsSubtotal(workOrderId);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (subtotalCents === 0) {
    if (hideWhenEmpty) return null;
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No costs</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <DollarSign className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">
        {formatCurrency(subtotalCents)}
      </span>
    </div>
  );
};

export default WorkOrderCostSubtotal;
