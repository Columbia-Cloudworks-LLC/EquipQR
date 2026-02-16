
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';


interface WorkOrdersHeaderProps {
  onCreateClick: () => void;
  subtitle?: string;
}

export const WorkOrdersHeader: React.FC<WorkOrdersHeaderProps> = ({
  onCreateClick,
  subtitle
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Work Orders</h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      <Button onClick={onCreateClick} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Create Work Order
      </Button>
    </div>
  );
};

