import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Plus } from 'lucide-react';

interface WorkOrdersEmptyStateProps {
  hasActiveFilters: boolean;
  onCreateClick: () => void;
}

export const WorkOrdersEmptyState: React.FC<WorkOrdersEmptyStateProps> = ({
  hasActiveFilters,
  onCreateClick
}) => {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No work orders found</h3>
        <p className="text-muted-foreground mb-4">
          {hasActiveFilters
            ? 'No work orders match your current filters.' 
            : 'Get started by creating your first work order.'}
        </p>
        {!hasActiveFilters && (
          <Button onClick={onCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Create Work Order
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

