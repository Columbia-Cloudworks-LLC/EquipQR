import React from 'react';
import { Badge } from "@/components/ui/badge";
import { History, Calendar } from "lucide-react";
import { format } from "date-fns";

interface HistoricalWorkOrderBadgeProps {
  workOrder: {
    is_historical?: boolean;
    historical_start_date?: string;
    historical_notes?: string;
  };
}

export const HistoricalWorkOrderBadge: React.FC<HistoricalWorkOrderBadgeProps> = ({
  workOrder
}) => {
  if (!workOrder.is_historical) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="flex items-center gap-1">
        <History className="h-3 w-3" />
        Historical
      </Badge>
      {workOrder.historical_start_date && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(new Date(workOrder.historical_start_date), 'MMM dd, yyyy')}
        </Badge>
      )}
    </div>
  );
};

